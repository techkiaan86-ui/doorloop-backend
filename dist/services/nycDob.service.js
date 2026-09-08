"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nycDobService = exports.NycDobService = void 0;
class NycDobService {
    baseUrl = 'https://data.cityofnewyork.us/resource/3h2n-5cm9.json';
    /**
     * Fetch violations from NYC Open Data Socrata API by BIN or Address
     */
    async fetchViolationsByBin(bin) {
        try {
            const appToken = process.env.NYC_OPEN_DATA_APP_TOKEN || '';
            const headers = {};
            if (appToken) {
                headers['X-App-Token'] = appToken;
            }
            const cleanBin = bin ? bin.trim() : '1000000';
            const params = new URLSearchParams({
                bin: cleanBin,
                $limit: '1000',
                $order: 'issue_date DESC',
            });
            const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
                method: 'GET',
                headers,
            });
            if (!response.ok) {
                console.error(`NYC DOB API HTTP Error ${response.status}: ${response.statusText}`);
                return [];
            }
            const data = await response.json();
            if (!data || !Array.isArray(data)) {
                return [];
            }
            return data.map((item) => {
                // Parse issue date (Format: YYYYMMDD or ISO)
                let formattedDate = new Date().toISOString().split('T')[0];
                if (item.issue_date && typeof item.issue_date === 'string') {
                    if (item.issue_date.length === 8 && /^\d{8}$/.test(item.issue_date)) {
                        formattedDate = `${item.issue_date.substring(0, 4)}-${item.issue_date.substring(4, 6)}-${item.issue_date.substring(6, 8)}`;
                    }
                    else {
                        formattedDate = item.issue_date.split('T')[0];
                    }
                }
                const category = (item.violation_category || '').toUpperCase();
                const isOpen = category.includes('ACTIVE') || item.violation_status === 'ACTIVE' || (!item.disposition_date && !category.includes('DISMISSED'));
                return {
                    violationNumber: item.number || item.violation_number || item.isn_dob_bis_viol || 'DOB-UNK',
                    issueDate: formattedDate,
                    violationTypeCode: item.violation_type_code || item.violation_type || 'DOB Code',
                    description: item.description || item.disposition_comments || 'NYC DOB Building Code Violation Notice',
                    dispositionComments: item.disposition_comments,
                    deviceNumber: item.device_number,
                    ecbNumber: item.ecb_number,
                    status: isOpen ? 'Open' : 'Resolved',
                    severity: (item.violation_type_code?.includes('V*') || item.ecb_number || category.includes('ACTIVE')) ? 'Critical' : 'Warning',
                };
            });
        }
        catch (error) {
            console.error('Error fetching NYC DOB Violations from Socrata API:', error);
            return [];
        }
    }
}
exports.NycDobService = NycDobService;
exports.nycDobService = new NycDobService();
