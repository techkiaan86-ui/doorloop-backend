export interface NycDobViolationResult {
  violationNumber: string;
  issueDate: string;
  violationTypeCode: string;
  description: string;
  dispositionComments?: string;
  deviceNumber?: string;
  ecbNumber?: string;
  status: string;
  severity: 'Critical' | 'Warning';
}

export class NycDobService {
  private baseUrl = 'https://data.cityofnewyork.us/resource/3h2n-b548.json';

  /**
   * Fetch violations from NYC Open Data Socrata API by BIN or Address
   */
  async fetchViolationsByBin(bin: string): Promise<NycDobViolationResult[]> {
    try {
      const appToken = process.env.NYC_OPEN_DATA_APP_TOKEN || '';
      const headers: Record<string, string> = {};
      if (appToken) {
        headers['X-App-Token'] = appToken;
      }

      const params = new URLSearchParams({
        bin: bin,
        $limit: '50',
        $order: 'issue_date DESC',
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return [];
      }

      const data: any = await response.json();
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map((item: any) => ({
        violationNumber: item.violation_number || item.is_number || 'DOB-UNK',
        issueDate: item.issue_date || new Date().toISOString().split('T')[0],
        violationTypeCode: item.violation_type_code || item.violation_category || 'DOB Code',
        description: item.description || item.disposition_comments || 'NYC DOB Building Code Violation Notice',
        dispositionComments: item.disposition_comments,
        deviceNumber: item.device_number,
        ecbNumber: item.ecb_number,
        status: item.violation_status === 'FILE' || item.disposition_date ? 'Open' : 'Resolved',
        severity: item.violation_type_code?.includes('V*') || item.ecb_number ? 'Critical' : 'Warning',
      }));
    } catch (error) {
      console.error('Error fetching NYC DOB Violations from Socrata API:', error);
      return [];
    }
  }
}

export const nycDobService = new NycDobService();
