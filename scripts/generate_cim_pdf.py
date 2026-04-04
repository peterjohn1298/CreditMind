"""
Generate a realistic Confidential Information Memorandum (CIM) for Ducommun Incorporated.
Based on publicly available information. For testing purposes only.

Run: python scripts/generate_cim_pdf.py
Output: scripts/ducommun_cim.pdf
"""

from fpdf import FPDF
from fpdf.enums import XPos, YPos
import os


class CIMDocument(FPDF):

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "STRICTLY CONFIDENTIAL - Project Falcon - Ducommun Incorporated", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10,
            "This document is strictly confidential. Not for distribution. "
            "Recipients must execute an NDA prior to receiving this document.",
            align="C"
        )

    def cover_page(self):
        self.add_page()
        # Dark navy background
        self.set_fill_color(10, 30, 65)
        self.rect(0, 0, 210, 297, "F")
        # Gold accent bar
        self.set_fill_color(180, 145, 60)
        self.rect(0, 80, 210, 4, "F")
        self.rect(0, 210, 210, 4, "F")

        self.set_y(30)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(180, 145, 60)
        self.multi_cell(0, 8, "PROJECT FALCON", align="C")

        self.set_y(90)
        self.set_font("Helvetica", "B", 30)
        self.set_text_color(255, 255, 255)
        self.multi_cell(0, 16, "DUCOMMUN\nINCORPORATED", align="C")

        self.ln(6)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(180, 200, 230)
        self.multi_cell(0, 8, "Confidential Information Memorandum", align="C")

        self.ln(4)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(150, 170, 210)
        self.multi_cell(0, 7,
            "Senior Secured Credit Facility - $500,000,000\n"
            "First Lien Term Loan B + Revolving Credit Facility",
            align="C"
        )

        self.set_y(220)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(150, 170, 210)
        info = [
            "Sole Lead Arranger & Bookrunner: Confidential",
            "Date: September 2024",
            "Ticker: DCO (NYSE)",
        ]
        for line in info:
            self.cell(0, 7, line, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.set_y(260)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 120, 160)
        self.multi_cell(0, 5,
            "THIS DOCUMENT IS STRICTLY CONFIDENTIAL AND IS BEING PROVIDED TO YOU SOLELY FOR "
            "THE PURPOSE OF EVALUATING A POTENTIAL CREDIT FACILITY. THIS DOCUMENT MAY NOT BE "
            "REPRODUCED OR DISCLOSED TO ANY OTHER PERSON WITHOUT PRIOR WRITTEN CONSENT.",
            align="C"
        )

    def section_title(self, title):
        self.set_fill_color(10, 30, 65)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 10, f"  {title}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(10, 30, 65)
        self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(180, 145, 60)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.set_text_color(0, 0, 0)
        self.ln(3)

    def body_text(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(3)

    def bullet(self, text, indent=5):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        x = self.get_x()
        self.set_x(self.l_margin + indent)
        self.cell(5, 6, "-")
        self.multi_cell(0, 6, text)
        self.set_x(x)

    def table_header(self, cols, widths, bg=(230, 235, 245)):
        self.set_fill_color(*bg)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(10, 30, 65)
        for col, w in zip(cols, widths):
            self.cell(w, 8, col, border=1, fill=True, align="C")
        self.ln()
        self.set_text_color(0, 0, 0)

    def table_row(self, values, widths, bold=False, highlight=False):
        if highlight:
            self.set_fill_color(220, 235, 255)
        else:
            self.set_fill_color(255, 255, 255)
        self.set_font("Helvetica", "B" if bold else "", 9)
        for val, w in zip(values, widths):
            self.cell(w, 7, str(val), border=1, fill=highlight or bold, align="L")
        self.ln()


def build_cim():
    pdf = CIMDocument(orientation="P", unit="mm", format="A4")
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Cover ────────────────────────────────────────────────────────────────
    pdf.cover_page()

    # ── Page 2: Transaction Overview & Highlights ─────────────────────────────
    pdf.add_page()
    pdf.section_title("TRANSACTION OVERVIEW")

    pdf.sub_title("Proposed Facility Structure")
    cols = ["Facility", "Amount", "Tenor", "Use of Proceeds"]
    widths = [50, 35, 30, 75]
    pdf.table_header(cols, widths)
    facilities = [
        ("Term Loan B",  "$375,000,000", "7 years", "Refinance existing TLB, fund acquisition"),
        ("Revolver",     "$125,000,000", "5 years", "Working capital, general corporate"),
        ("Total Facility","$500,000,000","-",       "-"),
    ]
    for row in facilities:
        pdf.table_row(row, widths, bold=(row[0] == "Total Facility"), highlight=(row[0] == "Total Facility"))

    pdf.ln(6)
    pdf.sub_title("Key Transaction Statistics (LTM June 2024)")
    cols = ["Metric", "Value", "Commentary"]
    widths = [60, 40, 90]
    pdf.table_header(cols, widths)
    stats = [
        ("Revenue",                "$737.0M",  "10.4% CAGR since FY2021"),
        ("Reported EBITDA",        "$74.2M",   "10.1% margin"),
        ("Conservative Adj. EBITDA","$91.3M",  "Deloitte QoE verified"),
        ("Total Debt (pro forma)", "$500.0M",  "Refinancing existing $475M"),
        ("Total Leverage",         "5.5x",     "Based on conservative EBITDA"),
        ("Senior Leverage",        "4.1x",     "TLB only / cons. EBITDA"),
        ("Interest Coverage",      "3.5x",     "EBITDA / cash interest"),
        ("Net Leverage",           "5.0x",     "Net of $46M cash"),
    ]
    for row in stats:
        pdf.table_row(row, widths)

    pdf.ln(6)
    pdf.section_title("INVESTMENT HIGHLIGHTS")

    highlights = [
        ("1. Mission-Critical Products with High Switching Costs",
         "Ducommun manufactures complex, safety-critical structural and electronic components "
         "that are fully qualified to specific platforms. Qualification processes take 18-36 months "
         "and cost $2-5M per component. Once qualified, Ducommun is effectively sole-source on "
         "those components for the program life. This creates exceptional customer retention."),
        ("2. 60% Defense Revenue Provides Visibility & Resilience",
         "Approximately 60% of revenue derives from U.S. defense programs under multi-year "
         "government contracts, including the F-35 Lightning II (contract through 2030), "
         "CH-47 Chinook heavy-lift helicopter, and multiple classified programs. Defense "
         "spending has been consistently increasing, providing a stable revenue floor."),
        ("3. Commercial Aerospace Recovery Driving Growth",
         "Post-COVID commercial aerospace recovery is accelerating. Boeing and Airbus backlogs "
         "represent 10+ years of production, driving a structural ramp in Ducommun's commercial "
         "segment. Commercial revenues grew 48% from FY2021 to LTM 2024, with further growth "
         "expected as production rates normalize."),
        ("4. Proven M&A Integration Capability",
         "Ducommun has successfully completed 6 acquisitions since 2018, building capabilities "
         "in electronic systems and engineered products. The Miltec acquisition (2022, $190M) "
         "expanded defense electronics exposure and is tracking ahead of plan."),
        ("5. Consistent Free Cash Flow Generation",
         "Conservative FCF conversion of ~65-70% of Adjusted EBITDA through the cycle, "
         "reflecting moderate capex requirements (~2.5-3% of revenue for maintenance). "
         "FCF provides consistent debt repayment capacity."),
    ]

    for title, text in highlights:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(10, 30, 65)
        pdf.multi_cell(0, 7, title)
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, text)
        pdf.ln(4)

    # ── Page 3: Company Overview ──────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("COMPANY OVERVIEW")

    pdf.sub_title("Business Description")
    pdf.body_text(
        "Ducommun Incorporated (NYSE: DCO) is a leading provider of complex structural components, "
        "electronic systems, and engineered products for the aerospace and defense industry. "
        "Founded in 1849 and headquartered in Santa Ana, California, Ducommun employs approximately "
        "6,500 people across 15 manufacturing facilities in the United States."
    )
    pdf.body_text(
        "The Company operates through two reportable segments: Electronic Systems and Structural "
        "Systems. Electronic Systems (~45% of revenue) designs and manufactures advanced circuit "
        "boards, radar systems, and electronic warfare components. Structural Systems (~55% of "
        "revenue) produces complex aerostructures, helicopter components, and fuselage sections."
    )

    pdf.sub_title("Operating Segments")
    cols = ["Segment", "Revenue ($M)", "% Total", "Key Products", "Key Programs"]
    widths = [35, 28, 18, 55, 54]
    pdf.table_header(cols, widths)
    segments = [
        ("Electronic Systems", "~$332M", "45%",
         "Circuit boards, radar systems, EW",
         "F-35, B-21 Raider, classified programs"),
        ("Structural Systems", "~$405M", "55%",
         "Aerostructures, fuselage, rotorcraft",
         "737 MAX, A320neo, CH-47 Chinook"),
        ("Total", "~$737M", "100%", "", ""),
    ]
    for row in segments:
        pdf.table_row(row, widths, bold=(row[0] == "Total"), highlight=(row[0] == "Total"))

    pdf.ln(5)
    pdf.sub_title("Manufacturing Footprint")
    pdf.body_text(
        "Ducommun operates 15 manufacturing facilities totalling approximately 3.8 million square "
        "feet across California, Arizona, Alabama, Kansas, and Arkansas. Key facilities include:"
    )
    facilities_list = [
        "Huntsville, AL (500,000 sq ft) - Primary structural manufacturing hub",
        "Parsons, KS (350,000 sq ft) - Electronic systems assembly",
        "Coxs Creek, KY (280,000 sq ft) - Rotorcraft components",
        "El Mirage, CA (250,000 sq ft) - Aerostructures",
        "Irvine, CA (200,000 sq ft) - Engineering & design center",
    ]
    for f in facilities_list:
        pdf.bullet(f)

    # ── Page 4: Market Overview ───────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("MARKET OVERVIEW")

    pdf.sub_title("Defense Market")
    pdf.body_text(
        "U.S. defense spending reached $858 billion in FY2023, the highest level in history, "
        "with the FY2024 National Defense Authorization Act authorizing $886 billion. "
        "Key drivers include the ongoing modernization of the U.S. Air Force (F-35, B-21 Raider), "
        "Army aviation (CH-47F upgrade), and increased electronic warfare investment in response "
        "to evolving threat environments. Defense spending is expected to grow 3-5% annually "
        "through 2030, providing a strong secular tailwind."
    )

    pdf.sub_title("Commercial Aerospace Market")
    pdf.body_text(
        "Global commercial aircraft deliveries are recovering strongly from COVID lows. "
        "Boeing and Airbus combined backlog of ~13,000 aircraft (representing 10+ years of "
        "production at current rates) underpins long-term demand. Key metrics:"
    )
    cols = ["Metric", "2021", "2022", "2023", "2024E", "2025E"]
    widths = [65, 20, 20, 20, 20, 20]
    pdf.table_header(cols, widths)
    market_data = [
        ("Boeing deliveries",             "340",  "480",  "528",  "~450*", "~600"),
        ("Airbus deliveries",             "611",  "663",  "735",  "~770",  "~820"),
        ("737 MAX monthly rate",          "19",   "26",   "31",   "~25*",  "~38"),
        ("A320 monthly rate",             "40",   "50",   "55",   "~60",   "~65"),
    ]
    for row in market_data:
        pdf.table_row(row, widths)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "* Boeing rates reflect 2024 production challenges; recovery expected H2 2025",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(0, 0, 0)

    pdf.ln(5)
    pdf.sub_title("Competitive Landscape")
    pdf.body_text(
        "Ducommun operates in a fragmented but consolidating market. Key competitors include "
        "Spirit AeroSystems (structural), Moog Inc. (electronic systems), TransDigm Group "
        "(various), and Kaman Aerospace. Ducommun's competitive position is differentiated by:"
    )
    advantages = [
        "Proprietary manufacturing processes for complex composite structures",
        "AS9100D and NADCAP certifications across all facilities",
        "Deep program integration - embedded engineering on key customer programs",
        "Sole-source positions on 65%+ of defense component programs",
        "Long-term relationships averaging 20+ years with top 5 customers",
    ]
    for a in advantages:
        pdf.bullet(a)

    # ── Page 5: Financial Summary ─────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("FINANCIAL SUMMARY")

    pdf.sub_title("Income Statement Summary ($000s)")
    cols = ["", "FY2021", "FY2022", "FY2023", "LTM Jun-24"]
    widths = [65, 30, 30, 30, 35]
    pdf.table_header(cols, widths)
    income_data = [
        ("Revenue",                    "550,200", "623,600", "689,300", "737,000"),
        ("  YoY Growth",               "-",       "13.3%",   "10.5%",   "10.1%"),
        ("Gross Profit",               "109,500", "126,800", "139,200", "148,900"),
        ("  Gross Margin",             "19.9%",   "20.3%",   "20.2%",   "20.2%"),
        ("Reported EBITDA",            "54,800",  "62,400",  "68,100",  "74,200"),
        ("  EBITDA Margin",            "10.0%",   "10.0%",   "9.9%",    "10.1%"),
        ("Conservative Adj. EBITDA",   "66,400",  "76,100",  "84,200",  "91,300"),
        ("  Adj. EBITDA Margin",       "12.1%",   "12.2%",   "12.2%",   "12.4%"),
        ("D&A",                        "19,800",  "21,400",  "22,100",  "23,100"),
        ("EBIT",                       "35,000",  "41,000",  "46,000",  "51,100"),
        ("Interest Expense",           "21,400",  "23,200",  "25,600",  "26,400"),
        ("Net Income",                 "22,100",  "27,300",  "31,500",  "35,100"),
    ]
    for row in income_data:
        bold = row[0] in ("Revenue", "Conservative Adj. EBITDA", "Net Income")
        highlight = row[0] == "Conservative Adj. EBITDA"
        pdf.table_row(row, widths, bold=bold, highlight=highlight)

    pdf.ln(5)
    pdf.sub_title("Balance Sheet Summary ($000s)")
    cols = ["", "FY2021", "FY2022", "FY2023", "Jun-24"]
    pdf.table_header(cols, widths)
    bs_data = [
        ("Cash & Equivalents",  "38,400",  "42,100",  "44,800",  "46,200"),
        ("Total Assets",        "1,042,000","1,218,000","1,256,000","1,271,000"),
        ("Total Debt",          "445,000",  "471,000",  "476,000",  "474,000"),
        ("Net Debt",            "406,600",  "428,900",  "431,200",  "427,800"),
        ("Total Equity",        "395,000",  "418,000",  "444,000",  "458,000"),
        ("Net Leverage (cons.)", "6.1x",    "5.6x",    "5.1x",    "4.7x"),
    ]
    for row in bs_data:
        bold = "Net Leverage" in row[0]
        pdf.table_row(row, widths, bold=bold, highlight=bold)

    pdf.ln(5)
    pdf.sub_title("Cash Flow Summary ($000s)")
    cols = ["", "FY2021", "FY2022", "FY2023", "LTM Jun-24"]
    pdf.table_header(cols, widths)
    cf_data = [
        ("Operating Cash Flow",   "42,100",  "51,200",  "58,600",  "62,400"),
        ("Capital Expenditures",  "(14,200)","(16,800)","(17,200)","(18,100)"),
        ("Free Cash Flow",        "27,900",  "34,400",  "41,400",  "44,300"),
        ("FCF / Adj. EBITDA",     "42.0%",   "45.2%",   "49.2%",   "48.5%"),
        ("Debt Repayment",        "(22,000)","(20,000)","(15,000)","(14,000)"),
    ]
    for row in cf_data:
        bold = row[0] == "Free Cash Flow"
        pdf.table_row(row, widths, bold=bold, highlight=bold)

    # ── Page 6: Management & Risks ────────────────────────────────────────────
    pdf.add_page()
    pdf.section_title("MANAGEMENT TEAM")

    mgmt = [
        ("Stephen G. Oswald",    "President & CEO",
         "Joined 2016. Previously CEO of Orbital Sciences Corporation. 30+ years aerospace. "
         "Led acquisition strategy and revenue growth from $480M to $737M."),
        ("Suman Mookerji",       "Chief Financial Officer",
         "Appointed December 2023. Previously CFO at Ducommun since 2019, transitioned to "
         "CFO from VP Finance. CPA, 20+ years aerospace/defense finance. "
         "Note: Previous CFO departed July 2023 after 3 years."),
        ("Jay Giacobbe",         "EVP & Chief Operating Officer",
         "Appointed January 2024. Previously SVP Operations. 25 years manufacturing. "
         "Note: Previous COO departed November 2023; new COO has strong operational track record."),
        ("James Heindl",         "VP & Chief Accounting Officer",
         "Joined 2018. CPA with Big 4 background. Continuity through recent C-suite changes."),
    ]

    cols = ["Name", "Title", "Background"]
    widths = [45, 45, 100]
    pdf.table_header(cols, widths)
    for row in mgmt:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_fill_color(255, 255, 255)
        for val, w in zip(row, widths):
            # Use multi_cell for the last column
            x_pos = pdf.get_x()
            y_pos = pdf.get_y()
            pdf.cell(w, 7, val if w < 90 else val[:80], border=1)
        pdf.ln()

    pdf.ln(5)
    pdf.section_title("KEY RISKS")

    risks = [
        ("Boeing Production Uncertainty",
         "HIGH",
         "Boeing's ongoing production rate challenges and quality issues could pressure "
         "~24% of Ducommun's revenue. A sustained 20% reduction in Boeing rates would reduce "
         "annual revenue by ~$35M and EBITDA by ~$7-8M."),
        ("Customer Concentration",
         "MEDIUM",
         "Top 5 customers represent ~75% of revenue. Loss of a major program qualification "
         "would be material. Partially mitigated by 20+ year relationships and switching costs."),
        ("Management Transition",
         "MEDIUM",
         "CFO and COO both departed in H2 2023. New leadership team in place but track record "
         "in roles is limited. Key person risk around CEO who has driven M&A strategy."),
        ("Defense Budget Risk",
         "LOW",
         "Potential U.S. defense budget sequestration could reduce program spend. "
         "Partially mitigated by strong bipartisan support for current programs."),
        ("Integration Risk",
         "LOW",
         "Ongoing Miltec integration is largely complete. Future M&A could create execution risk "
         "given current leverage levels."),
    ]

    cols = ["Risk Factor", "Severity", "Description"]
    widths = [55, 22, 113]
    pdf.table_header(cols, widths)
    sev_colors = {"HIGH": (220, 60, 60), "MEDIUM": (220, 140, 0), "LOW": (0, 150, 80)}
    for risk in risks:
        pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(widths[0], 7, risk[0], border=1)
        color = sev_colors.get(risk[1], (0, 0, 0))
        pdf.set_text_color(*color)
        pdf.cell(widths[1], 7, risk[1], border=1, align="C")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(widths[2], 7, risk[2][:100], border=1)
        pdf.ln()

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 6,
        "This Confidential Information Memorandum has been prepared by Ducommun Incorporated "
        "and its advisors solely for the purpose of providing information to prospective lenders. "
        "The information contained herein includes forward-looking statements that involve risks "
        "and uncertainties. Actual results may differ materially from those projected."
    )

    output_path = os.path.join(os.path.dirname(__file__), "ducommun_cim.pdf")
    pdf.output(output_path)
    print(f"CIM generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_cim()
