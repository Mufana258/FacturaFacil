import { createElement, type ReactElement } from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { DocumentData } from "@/components/quotation-document";
import { formatDate, formatMoney, formatMZN, formatPercentFromBp, formatQuantity } from "@/lib/money";

const NAVY = "#163A5F";
const GREEN = "#10B981";
const MUTED = "#64748B";
const LINE = "#E2E8F0";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 52,
    paddingHorizontal: 38,
    fontSize: 9.2,
    fontFamily: "Helvetica",
    color: "#0F172A",
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.2,
    borderBottomColor: NAVY,
    paddingBottom: 12,
  },
  brand: { flexDirection: "row", maxWidth: "62%" },
  logo: { width: 46, height: 46, marginRight: 10, objectFit: "contain" },
  logoFallback: {
    width: 40,
    height: 40,
    marginRight: 10,
    backgroundColor: NAVY,
    color: "#FFFFFF",
    fontSize: 17,
    paddingTop: 11,
    textAlign: "center",
    borderRadius: 4,
  },
  brandName: { fontSize: 14, color: NAVY, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: MUTED, marginTop: 1.5 },
  docTitle: { fontSize: 8, letterSpacing: 2, color: GREEN, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docNumber: { fontSize: 12, fontFamily: "Courier-Bold", textAlign: "right", marginTop: 3 },
  section: { flexDirection: "row", marginTop: 14 },
  sectionCol: { flex: 1 },
  label: { fontSize: 7.5, letterSpacing: 1, color: MUTED, fontFamily: "Helvetica-Bold" },
  value: { fontSize: 9.5, marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginTop: 16,
    paddingBottom: 5,
  },
  th: { fontSize: 7.5, color: MUTED, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  row: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: "#F1F5F9", paddingVertical: 6 },
  desc: { width: "45%", paddingRight: 6 },
  qty: { width: "10%", textAlign: "right", paddingRight: 6 },
  unit: { width: "12%", paddingRight: 6 },
  price: { width: "12%", textAlign: "right", paddingRight: 6 },
  disc: { width: "8%", textAlign: "right", paddingRight: 6 },
  total: { width: "13%", textAlign: "right" },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: NAVY,
    marginTop: 5,
    paddingTop: 6,
  },
  grandLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.8 },
  grandValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  notesWrap: { flexDirection: "row", marginTop: 18, paddingTop: 10, borderTopWidth: 0.6, borderTopColor: LINE },
  noteCol: { flex: 1, paddingRight: 12 },
  noteText: { fontSize: 8.2, color: "#334155", marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 38,
    right: 38,
    borderTopWidth: 0.6,
    borderTopColor: LINE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.2,
    color: MUTED,
  },
  status: { fontSize: 7.5, color: MUTED, textAlign: "right", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
});

const STATUS_TEXT: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceite: "Aceite",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
};

export function QuotePdf({
  data,
  logo,
  statusLabel,
}: {
  data: DocumentData;
  logo: string | null;
  statusLabel?: string;
}) {
  const business = data.business;
  const footerContact = [business.phone, business.email, business.address].filter(Boolean).join("  ·  ");

  return (
    <Document title={`Cotação ${data.reference}`} author={business.name} language="pt-MZ">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logo ? (
              <Image style={styles.logo} src={logo} />
            ) : (
              <Text style={styles.logoFallback}>{business.name.slice(0, 1).toUpperCase()}</Text>
            )}
            <View>
              <Text style={styles.brandName}>{business.name}</Text>
              {business.nuit ? <Text style={styles.small}>NUIT: {business.nuit}</Text> : null}
              {business.address ? <Text style={styles.small}>{business.address}</Text> : null}
              {business.city || business.province ? (
                <Text style={styles.small}>{[business.city, business.province].filter(Boolean).join(" · ")}</Text>
              ) : null}
              <Text style={styles.small}>
                {[business.phone, business.email].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>COTAÇÃO</Text>
            <Text style={styles.docNumber}>{data.reference}</Text>
            {statusLabel ? <Text style={styles.status}>{statusLabel}</Text> : null}
            <Text style={styles.small}>Emissão: {formatDate(data.issueDate)}</Text>
            <Text style={styles.small}>Validade: {formatDate(data.validUntil)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCol}>
            <Text style={styles.label}>CLIENTE</Text>
            <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>{data.customer.name}</Text>
            {data.customer.company_name ? <Text style={styles.small}>{data.customer.company_name}</Text> : null}
            {data.customer.nuit ? <Text style={styles.small}>NUIT: {data.customer.nuit}</Text> : null}
            {data.customer.address ? <Text style={styles.small}>{data.customer.address}</Text> : null}
            {data.customer.city ? <Text style={styles.small}>{data.customer.city}</Text> : null}
            <Text style={styles.small}>
              {[data.customer.phone, data.customer.email].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View style={styles.sectionCol}>
            <Text style={styles.label}>ASSUNTO</Text>
            <Text style={styles.value}>{data.title || "Proposta comercial"}</Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.desc]}>DESCRIÇÃO</Text>
          <Text style={[styles.th, styles.qty]}>QTD.</Text>
          <Text style={[styles.th, styles.unit]}>UNID.</Text>
          <Text style={[styles.th, styles.price]}>PREÇO</Text>
          <Text style={[styles.th, styles.disc]}>DESC.</Text>
          <Text style={[styles.th, styles.total]}>TOTAL</Text>
        </View>

        {data.items.map((item, index) => (
          <View style={styles.row} key={index} wrap={false}>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.qty}>{formatQuantity(item.quantityMilli)}</Text>
            <Text style={styles.unit}>{item.unit}</Text>
            <Text style={styles.price}>{formatMoney(item.unitPriceCents)}</Text>
            <Text style={styles.disc}>{item.discountBp ? `${formatPercentFromBp(item.discountBp)}%` : "-"}</Text>
            <Text style={[styles.total, { fontFamily: "Helvetica-Bold" }]}>{formatMoney(item.lineTotalCents)}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.small}>Subtotal</Text>
              <Text>{formatMoney(data.subtotalCents)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.small}>Descontos</Text>
              <Text>-{formatMoney(data.discountCents)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.small}>IVA</Text>
              <Text>{formatMoney(data.taxCents)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandValue}>{formatMZN(data.totalCents)}</Text>
            </View>
          </View>
        </View>

        {data.notes || data.terms ? (
          <View style={styles.notesWrap} wrap={false}>
            {data.notes ? (
              <View style={styles.noteCol}>
                <Text style={styles.label}>NOTAS</Text>
                <Text style={styles.noteText}>{data.notes}</Text>
              </View>
            ) : null}
            {data.terms ? (
              <View style={styles.noteCol}>
                <Text style={styles.label}>TERMOS E CONDIÇÕES</Text>
                <Text style={styles.noteText}>{data.terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>
            {business.name}
            {footerContact ? `  ·  ${footerContact}` : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderQuotePdf(props: { data: DocumentData; logo: string | null; statusLabel?: string }): Promise<Buffer> {
  return renderToBuffer(createElement(QuotePdf, props) as unknown as ReactElement<DocumentProps>);
}

export { STATUS_TEXT };
