import bcrypt from 'bcrypt';
async function main() {
  const hash = '$2b$12$srr/JKd6.NrAkA/oBuUpVuUfI1qHr7A0UFMolj0vLAiqGsRvDLUfO';
  const match = await bcrypt.compare('whatslandlord@123', hash);
  console.log('MATCH RESULT:', match);
}
main();
