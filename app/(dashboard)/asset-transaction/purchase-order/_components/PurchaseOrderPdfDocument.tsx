import type { purchaseOrderShowType } from "@/data/purchase-order"
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

type PurchaseOrderDetail = purchaseOrderShowType["details"][number]

interface PurchaseOrderPdfDocumentProps {
  data: purchaseOrderShowType
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#09090b",
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: 700,
  },
  subtitle: {
    marginBottom: 16,
    color: "#71717a",
  },
  section: {
    marginBottom: 16,
  },
  orderInfo: {
    display: "flex",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "solid",
  },
  orderColumn: {
    width: "50%",
    padding: 10,
  },
  supplierColumn: {
    borderLeftWidth: 1,
    borderLeftColor: "#e4e4e7",
    borderLeftStyle: "solid",
  },
  sectionLabel: {
    color: "#71717a",
    fontSize: 8,
    marginBottom: 7,
  },
  infoRow: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "34%",
    color: "#71717a",
  },
  value: {
    width: "66%",
    fontWeight: 700,
  },
  supplierName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  supplierDetail: {
    color: "#27272a",
    lineHeight: 1.3,
  },
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "solid",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "solid",
  },
  headerRow: {
    backgroundColor: "#f4f4f5",
    fontWeight: 700,
  },
  cell: {
    padding: 6,
    borderRightWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "solid",
  },
  assetCell: {
    width: "25%",
  },
  specCell: {
    width: "35%",
  },
  qtyCell: {
    width: "10%",
    textAlign: "right",
  },
  moneyCell: {
    width: "15%",
    textAlign: "right",
  },
  summary: {
    marginTop: 12,
    marginLeft: "auto",
    width: "40%",
  },
  summaryRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderColor: "#09090b",
    borderStyle: "solid",
    paddingTop: 6,
    fontWeight: 700,
  },
})

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("id-ID")
}

function formatText(value: string | null | undefined) {
  return value?.trim() ? value : "-"
}

function formatVillage(
  village: purchaseOrderShowType["supplier"]["village"] | null | undefined
) {
  if (!village) return "-"
  const parts = [
    village.name,
    village.district?.name,
    village.regency?.name,
    village.province?.name,
  ].filter(Boolean)
  const line = parts.length ? parts.join(", ") : "-"
  return village.postalCode ? `${line} ${village.postalCode}` : line
}

function formatPurchaseRequest(data: purchaseOrderShowType) {
  return data.purchaseRequest?.prNo ?? "-"
}

function formatAssetCode(detail: PurchaseOrderDetail) {
  const assetCode = detail.prDetail?.assetCode

  return assetCode ? `${assetCode.code} - ${assetCode.name}` : "-"
}

function formatSpecifications(detail: PurchaseOrderDetail) {
  const specifications = detail.prDetail?.specifications ?? []

  if (!specifications.length) {
    return "-"
  }

  return specifications
    .map((specification) => {
      const name = specification.spec?.name ?? "-"
      const value = specification.specValue ?? "-"

      return `${name}: ${value}`
    })
    .join("\n")
}

function calculateSubtotal(details: PurchaseOrderDetail[]) {
  return details.reduce((sum, detail) => sum + Number(detail.total ?? 0), 0)
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

export default function PurchaseOrderPdfDocument({
  data,
}: PurchaseOrderPdfDocumentProps) {
  const subtotal = calculateSubtotal(data.details)
  const shippingCost = Number(data.shippingCost ?? 0)
  const grandTotal = subtotal + shippingCost

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>Purchase Order</Text>
          <Text style={styles.subtitle}>{formatText(data.description)}</Text>
        </View>

        <View style={[styles.section, styles.orderInfo]}>
          <View style={styles.orderColumn}>
            <Text style={styles.sectionLabel}>ORDER DETAILS</Text>
            <InfoRow label="PO Number" value={data.poNo} />
            <InfoRow label="Date" value={data.date} />
            <InfoRow
              label="Purchase Request"
              value={formatPurchaseRequest(data)}
            />
            <InfoRow label="Status" value={data.status} />
          </View>

          <View style={[styles.orderColumn, styles.supplierColumn]}>
            <Text style={styles.sectionLabel}>SUPPLIER DETAILS</Text>
            <Text style={styles.supplierName}>
              {formatText(data.supplier?.name)}
            </Text>
            <Text style={styles.supplierDetail}>
              {formatText(data.supplier?.address)}
            </Text>
            <Text style={styles.supplierDetail}>
              {formatVillage(data.supplier?.village)}
            </Text>
            <Text style={styles.supplierDetail}>
              Nomor Rekening: {formatText(data.supplierAccount?.accountNo)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.assetCell]}>Asset Code</Text>
              <Text style={[styles.cell, styles.specCell]}>Specifications</Text>
              <Text style={[styles.cell, styles.qtyCell]}>Qty</Text>
              <Text style={[styles.cell, styles.moneyCell]}>Price</Text>
              <Text style={[styles.cell, styles.moneyCell]}>Total</Text>
            </View>

            {data.details.length ? (
              data.details.map((detail) => (
                <View key={detail.id} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, styles.assetCell]}>
                    {formatAssetCode(detail)}
                  </Text>
                  <Text style={[styles.cell, styles.specCell]}>
                    {formatSpecifications(detail)}
                  </Text>
                  <Text style={[styles.cell, styles.qtyCell]}>
                    {detail.quantity ?? 0}
                  </Text>
                  <Text style={[styles.cell, styles.moneyCell]}>
                    {formatCurrency(detail.price)}
                  </Text>
                  <Text style={[styles.cell, styles.moneyCell]}>
                    {formatCurrency(detail.total)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.row}>
                <Text style={styles.cell}>No order details.</Text>
              </View>
            )}
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Shipping Cost</Text>
              <Text>{formatCurrency(shippingCost)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text>Grand Total</Text>
              <Text>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
