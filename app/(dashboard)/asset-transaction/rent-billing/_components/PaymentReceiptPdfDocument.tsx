import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#09090b" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: "#71717a", marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#e4e4e7" },
  label: { color: "#71717a" },
  value: { fontWeight: 700 },
})

export function PaymentReceiptPdfDocument({
  invoiceNo,
  companyName,
  period,
  paidAt,
  method,
  amount,
  reference,
}: {
  invoiceNo: string
  companyName: string
  period: string
  paidAt: string
  method: string
  amount: string
  reference: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Payment receipt</Text>
        <Text style={styles.subtitle}>Lease invoice payment record</Text>
        <View style={styles.row}><Text style={styles.label}>Receipt</Text><Text style={styles.value}>{invoiceNo}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Company</Text><Text style={styles.value}>{companyName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Billing period</Text><Text style={styles.value}>{period}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Payment date</Text><Text style={styles.value}>{paidAt}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Method</Text><Text style={styles.value}>{method}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Amount received</Text><Text style={styles.value}>{amount}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Transaction reference</Text><Text style={styles.value}>{reference}</Text></View>
      </Page>
    </Document>
  )
}
