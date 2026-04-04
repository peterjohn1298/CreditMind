"""
Generate a realistic Quality of Earnings (QoE) report PDF for Ducommun Incorporated.
Based on publicly available financial data from Ducommun's 10-K filings.
For testing purposes only.

Run: python scripts/generate_qoe_pdf.py
Output: scripts/ducommun_qoe_report.pdf
"""

from fpdf import FPDF
from fpdf.enums import XPos, YPos
import os


class QoEReport(FPDF):

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "CONFIDENTIAL - Quality of Earnings Report - Ducommun Incorporated", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, "Privileged & Confidential - Prepared for Deal Team Use Only", align="C")

    def cover_page(self):
        self.add_page()
        self.set_fill_color(15, 40, 80)
        self.rect(0, 0, 210, 297, "F")

        self.set_y(60)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(255, 255, 255)
        self.multi_cell(0, 14, "QUALITY OF EARNINGS REPORT", align="C")

        self.ln(8)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(180, 200, 230)
        self.multi_cell(0, 12, "Ducommun Incorporated", align="C")

        self.ln(6)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(150, 175, 210)
        self.multi_cell(0, 8, "Project Falcon", align="C")

        self.ln(20)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(200, 215, 235)
        details = [
            ("Prepared by:", "Deloitte Financial Advisory Services LLP"),
            ("Engagement:",  "Quality of Earnings - LTM June 2024"),
            ("Prepared for:", "Confidential - Lender Due Diligence"),
            ("Date:",        "September 2024"),
            ("Status:",      "DRAFT - Subject to Change"),
        ]
        for label, value in details:
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(180, 200, 230)
            self.cell(55, 8, label, align="R")
            self.set_font("Helvetica", "", 11)
            self.set_text_color(230, 235, 245)
            self.cell(0, 8, f"  {value}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.ln(30)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(120, 145, 180)
        disclaimer = (
            "This report has been prepared solely for the use of the identified recipient in connection "
            "with the proposed financing transaction. It may not be relied upon by any other party or "
            "for any other purpose. All figures in USD thousands unless otherwise stated."
        )
        self.multi_cell(0, 6, disclaimer, align="C")

    def section_title(self, title, color=(15, 40, 80)):
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 10, f"  {title}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(15, 40, 80)
        self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(15, 40, 80)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.set_text_color(0, 0, 0)
        self.ln(3)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(3)

    def table_header(self, cols, widths):
        self.set_fill_color(230, 235, 245)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(15, 40, 80)
        for col, w in zip(cols, widths):
            self.cell(w, 8, col, border=1, fill=True, align="C")
        self.ln()
        self.set_text_color(0, 0, 0)

    def table_row(self, values, widths, bold=False, highlight=False, align="L"):
        if highlight:
            self.set_fill_color(220, 235, 255)
        else:
            self.set_fill_color(255, 255, 255)
        self.set_font("Helvetica", "B" if bold else "", 9)
        for val, w in zip(values, widths):
            self.cell(w, 7, str(val), border=1, fill=highlight or bold, align=align)
        self.ln()


def fmt(n):
    """Format number as currency string."""
    if n is None:
        return "-"
    return f"${n:,.0f}"


def build_report():
    pdf = QoEReport(orientation="P", unit="mm", format="A4")
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Cover ────────────────────────────────────────────────────────────────
    pdf.cover_page()

    # ── Page 2: Executive Summary ─────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("EXECUTIVE SUMMARY")

    pdf.body_text(
        "Deloitte Financial Advisory Services LLP ('Deloitte') was engaged by the Deal Team "
        "to perform a Quality of Earnings ('QoE') analysis of Ducommun Incorporated ('Ducommun' "
        "or the 'Company') in connection with a proposed senior secured credit facility. "
        "Our procedures were performed on the LTM period ended June 30, 2024, with reference "
        "to the three fiscal years ended December 31, 2021, 2022, and 2023."
    )

    pdf.body_text(
        "Ducommun is a leading provider of complex structural components, electronic systems, "
        "and engineered products to the aerospace and defense industry. The Company serves "
        "major OEMs including Boeing, Airbus, Raytheon Technologies, and Lockheed Martin. "
        "Approximately 60% of revenue is derived from defense programs, providing significant "
        "revenue visibility through long-term government contracts."
    )

    pdf.sub_title("Key Findings")
    findings = [
        ("Reported EBITDA (LTM June 2024):", "$74,200"),
        ("Total Add-Backs Reviewed:", "$21,350"),
        ("  - Supportable Adjustments:", "$17,100"),
        ("  - Questionable Adjustments:", "$3,100"),
        ("  - Rejected Adjustments:", "$1,150"),
        ("Conservative Adjusted EBITDA:", "$91,300"),
        ("Base Adjusted EBITDA (incl. questionable):", "$94,400"),
        ("EBITDA Margin (Conservative):", "12.4%"),
        ("Adjustment Quality:", "MEDIUM-HIGH"),
    ]

    pdf.set_font("Helvetica", "", 10)
    for label, value in findings:
        bold = "EBITDA" in label and "Add-Back" not in label and "Adjustment" not in label and "Questionable" not in label and "Rejected" not in label
        pdf.set_font("Helvetica", "B" if bold else "", 10)
        pdf.cell(120, 7, label)
        pdf.set_font("Helvetica", "B" if bold else "", 10)
        pdf.cell(0, 7, value, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(5)
    pdf.body_text(
        "We note that the largest single add-back relates to acquisition integration costs "
        "associated with the Miltec Corporation acquisition completed in FY2022. These costs "
        "totalling $6,200 are substantially complete as of Q2 2024 and we consider them "
        "supportable. However, we recommend the lender apply a conservative EBITDA of $91,300 "
        "as the base for leverage calculations, excluding the $3,100 in questionable adjustments."
    )

    # ── Page 3: EBITDA Bridge ─────────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("EBITDA RECONCILIATION & BRIDGE")

    pdf.sub_title("Reported to Adjusted EBITDA Bridge (LTM June 2024, $000s)")

    cols = ["Item", "Amount ($000s)", "Category", "Verdict"]
    widths = [85, 35, 35, 25]
    pdf.table_header(cols, widths)

    bridge_items = [
        ("Net Income (GAAP)",                    "35,100",  "Reported",       "-"),
        ("+ Income Tax Expense",                 "11,200",  "Reported",       "-"),
        ("+ Interest Expense",                   "26,400",  "Reported",       "-"),
        ("+ Depreciation & Amortization",        "23,100",  "Reported",       "-"),
        ("= Reported EBITDA",                    "74,200",  "-",              "-"),
        ("",                                     "",        "",               ""),
        ("ADD-BACKS:",                           "",        "",               ""),
        ("Miltec acquisition integration",       "6,200",   "M&A / One-time", "SUPPORT"),
        ("Restructuring - facility closures",    "3,800",   "One-time",       "SUPPORT"),
        ("ERP system implementation costs",      "2,900",   "One-time",       "SUPPORT"),
        ("Stock-based compensation",             "4,200",   "Non-cash",       "SUPPORT"),
        ("Management consulting (pre-close)",    "2,100",   "One-time",       "SUPPORT"),
        ("Executive severance (2 officers)",     "1,650",   "One-time",       "QUESTIONABLE"),
        ("'Strategic review' advisory fees",     "950",     "Recurring?",     "QUESTIONABLE"),
        ("Supply chain disruption costs",        "500",     "Recurring?",     "QUESTIONABLE"),
        ("Legal settlement - prior period",      "850",     "One-time",       "SUPPORT"),
        ("COVID PPE / safety costs",             "800",     "Fully recurring","REJECT"),
        ("IT infrastructure 'upgrade' costs",    "350",     "Recurring capex","REJECT"),
        ("",                                     "",        "",               ""),
        ("= Conservative Adjusted EBITDA",       "91,300",  "-",              "-"),
        ("= Base Adjusted EBITDA",               "94,400",  "-",              "-"),
    ]

    for row in bridge_items:
        if row[0] == "":
            pdf.ln(2)
            continue
        bold = "EBITDA" in row[0] and ("Reported" in row[0] or "Adjusted" in row[0])
        highlight = bold
        color = (0, 100, 0) if row[3] == "SUPPORT" else (180, 0, 0) if row[3] == "REJECT" else (150, 100, 0) if row[3] == "QUESTIONABLE" else (0, 0, 0)
        pdf.set_font("Helvetica", "B" if bold else "", 9)
        pdf.set_text_color(*color) if row[3] in ["SUPPORT", "REJECT", "QUESTIONABLE"] else pdf.set_text_color(0, 0, 0)
        if highlight:
            pdf.set_fill_color(220, 235, 255)
            pdf.set_text_color(15, 40, 80)
        else:
            pdf.set_fill_color(255, 255, 255)
        for val, w in zip(row, widths):
            pdf.cell(w, 7, val, border=1, fill=highlight, align="L")
        pdf.ln()
        pdf.set_text_color(0, 0, 0)

    # ── Page 4: Add-Back Detail ───────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("ADD-BACK ANALYSIS - DETAIL")

    add_backs = [
        {
            "name": "1. Miltec Corporation Acquisition Integration Costs - $6,200",
            "verdict": "SUPPORTABLE",
            "detail": (
                "Following the acquisition of Miltec Corporation in March 2022 for $190M, the Company "
                "incurred significant integration costs including workforce rationalization ($2.1M), "
                "facility consolidation ($1.8M), IT systems migration ($1.4M), and related professional fees ($0.9M). "
                "Management confirms integration activities are 85% complete as of June 2024. "
                "We verified $5.8M of the $6.2M through invoices and board minutes. "
                "We consider this add-back SUPPORTABLE with the caveat that $0.4M relates to "
                "ongoing facility lease costs that may recur through 2025."
            ),
            "color": (0, 120, 0),
        },
        {
            "name": "2. Restructuring - Facility Closures - $3,800",
            "verdict": "SUPPORTABLE",
            "detail": (
                "The Company announced closure of its Monrovia, CA and Parsons, KS manufacturing "
                "facilities in Q3 2023, consolidating production into its Huntsville, AL campus. "
                "Costs include severance ($1.9M), lease termination penalties ($1.1M), and asset "
                "write-downs ($0.8M). Closure activities are complete. We verified through "
                "facility closure notices and severance agreements. NON-RECURRING."
            ),
            "color": (0, 120, 0),
        },
        {
            "name": "3. Stock-Based Compensation - $4,200",
            "verdict": "SUPPORTABLE",
            "detail": (
                "Non-cash stock compensation expense per GAAP. Standard add-back in leveraged credit "
                "analysis. Grants have been consistent at $3.8M-$4.5M over the review period. "
                "We note this is a RECURRING non-cash charge - the lender should be aware "
                "that dilution occurs annually. Fully supportable as an EBITDA add-back."
            ),
            "color": (0, 120, 0),
        },
        {
            "name": "4. Executive Severance - $1,650",
            "verdict": "QUESTIONABLE",
            "detail": (
                "Relates to departure of CFO (July 2023) and Chief Operating Officer (November 2023). "
                "We note that C-suite turnover at this frequency (two senior officers in one year) "
                "raises questions about organizational stability. While individual severance payments "
                "are technically one-time, the pattern suggests potential ongoing management instability. "
                "We classify as QUESTIONABLE and recommend the lender investigate the circumstances "
                "of both departures during management meetings."
            ),
            "color": (180, 100, 0),
        },
        {
            "name": "5. Supply Chain Disruption Costs - $500",
            "verdict": "QUESTIONABLE",
            "detail": (
                "Management describes expediting fees, premium freight, and supplier qualification costs "
                "as a result of 'extraordinary supply chain disruption.' However, aerospace supply chain "
                "disruption has been an industry-wide issue since 2021 and we see no evidence these "
                "costs will not recur in FY2024-2025 given ongoing Boeing production rate issues. "
                "Classified as QUESTIONABLE."
            ),
            "color": (180, 100, 0),
        },
        {
            "name": "6. COVID PPE / Safety Costs - $800",
            "verdict": "REJECT",
            "detail": (
                "Management includes ongoing workplace safety enhancement costs under 'COVID legacy.' "
                "These costs relate to permanent facility upgrades (HVAC, partitioning) that now form "
                "part of normal operating infrastructure. We REJECT this add-back as the costs are "
                "recurring in nature and represent permanent business operations costs."
            ),
            "color": (180, 0, 0),
        },
    ]

    for item in add_backs:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*item["color"])
        pdf.multi_cell(0, 7, item["name"])
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Verdict:")
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 6, item["verdict"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(50, 50, 50)
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 6, item["detail"])
        pdf.ln(4)

    # ── Page 5: Revenue & Working Capital ────────────────────────────────────
    pdf.add_page()
    pdf.section_title("REVENUE QUALITY ASSESSMENT")

    pdf.sub_title("Revenue by Segment (LTM June 2024, $000s)")
    cols = ["Segment", "LTM 2024", "FY2023", "FY2022", "FY2021", "CAGR"]
    widths = [55, 27, 27, 27, 27, 27]
    pdf.table_header(cols, widths)

    revenue_data = [
        ("Defense Systems",       "444,600", "422,200", "392,100", "352,800", "8.0%"),
        ("Commercial Aerospace",  "292,400", "267,100", "231,500", "197,400", "13.9%"),
        ("Total Revenue",         "737,000", "689,300", "623,600", "550,200", "10.4%"),
    ]
    for row in revenue_data:
        bold = row[0] == "Total Revenue"
        pdf.table_row(row, widths, bold=bold, highlight=bold)

    pdf.ln(5)
    pdf.body_text(
        "Revenue quality is GOOD. Defense revenues (60% of total) benefit from multi-year "
        "government contract visibility. Key programs include the F-35 Lightning II structural "
        "components contract (through 2030), CH-47 Chinook fuselage panels, and multiple "
        "classified programs. Commercial aerospace revenues are recovering strongly driven by "
        "Boeing 737 MAX and Airbus A320neo production ramp. We note Boeing's current production "
        "challenges create near-term risk to the commercial segment (~$80M revenue at risk if "
        "Boeing rates remain suppressed). The defense segment provides a strong offset."
    )

    pdf.sub_title("Customer Concentration")
    cols = ["Customer", "Est. Revenue ($000s)", "% of Total", "Contract Visibility"]
    widths = [65, 45, 30, 50]
    pdf.table_header(cols, widths)
    customers = [
        ("Boeing Company",            "~176,900", "~24%",  "Multi-year, renewed 2023"),
        ("Raytheon Technologies",     "~132,700", "~18%",  "Long-term defense programs"),
        ("Lockheed Martin",           "~103,200", "~14%",  "F-35 program, 2030"),
        ("Airbus",                    "~80,100",  "~11%",  "A320 family, ongoing"),
        ("Northrop Grumman",          "~59,000",  "~8%",   "B-21 Raider, classified"),
        ("Other (200+ customers)",    "~185,100", "~25%",  "Various"),
        ("Total",                     "~737,000", "100%",  ""),
    ]
    for row in customers:
        bold = row[0] == "Total"
        pdf.table_row(row, widths, bold=bold, highlight=bold)

    pdf.ln(5)
    pdf.body_text(
        "Customer concentration is MODERATE. Top 5 customers represent ~75% of revenue, "
        "which is typical for aerospace Tier 1 suppliers. Positively, all top 5 are "
        "investment-grade primes with strong programs. Boeing concentration (~24%) warrants "
        "monitoring given current production challenges."
    )

    pdf.sub_title("Working Capital Assessment")
    pdf.body_text(
        "Working capital is NORMAL for the industry. DSO of ~55 days is consistent with "
        "aerospace industry norms (government contractors typically 45-65 days). Inventory "
        "turns of 4.2x are in line with peers. No unusual working capital movements observed "
        "in the review period. The Company does not exhibit signs of revenue pull-forward "
        "or inventory channel stuffing."
    )

    # ── Page 6: Conclusions ───────────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("CONCLUSIONS & RECOMMENDATIONS")

    pdf.sub_title("Summary EBITDA Table ($000s)")
    cols = ["Metric", "LTM June 2024", "FY2023", "FY2022", "FY2021"]
    widths = [65, 35, 30, 30, 30]
    pdf.table_header(cols, widths)
    summary_rows = [
        ("Revenue",                  "737,000", "689,300", "623,600", "550,200"),
        ("Reported EBITDA",          "74,200",  "68,100",  "62,400",  "54,800"),
        ("EBITDA Margin",            "10.1%",   "9.9%",    "10.0%",   "10.0%"),
        ("Conservative Adj. EBITDA", "91,300",  "84,200",  "76,100",  "66,400"),
        ("Adj. EBITDA Margin",       "12.4%",   "12.2%",   "12.2%",   "12.1%"),
        ("Base Adj. EBITDA",         "94,400",  "87,100",  "78,800",  "68,500"),
    ]
    for row in summary_rows:
        bold = "Adj. EBITDA" in row[0] or "Revenue" == row[0]
        pdf.table_row(row, widths, bold=bold, highlight=("Conservative" in row[0]))

    pdf.ln(6)
    pdf.sub_title("Our Conclusions")
    conclusions = [
        ("EBITDA Quality:", "MEDIUM-HIGH. The majority of adjustments are supportable "
         "and relate to clearly identified non-recurring events (acquisition, restructuring). "
         "We have flagged $3.1M in questionable items."),
        ("Recommended Base:", "Conservative Adjusted EBITDA of $91.3M for leverage calculations. "
         "This represents a meaningful 23% premium over reported EBITDA and is defensible."),
        ("Revenue Quality:", "GOOD. Defense contract visibility provides strong predictability. "
         "Commercial aerospace recovery is real but Boeing-dependent."),
        ("Key Risk:", "Boeing production rate uncertainty could pressure ~$80M of commercial "
         "revenue. We recommend the lender stress test at -10% and -20% Boeing revenue scenarios."),
        ("Management Turnover:", "The departure of both CFO and COO within 6 months warrants "
         "investigation. New CFO appointed December 2023 - track record TBD."),
    ]
    for label, text in conclusions:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(15, 40, 80)
        pdf.cell(0, 7, label, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, text)
        pdf.ln(3)

    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 6,
        "This report is based on information provided by management and publicly available data. "
        "Deloitte has not audited or independently verified all information. This report does not "
        "constitute an audit, review, or compilation of financial statements. It is intended solely "
        "to assist the identified lender in its credit evaluation process."
    )

    output_path = os.path.join(os.path.dirname(__file__), "ducommun_qoe_report.pdf")
    pdf.output(output_path)
    print(f"QoE report generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_report()
