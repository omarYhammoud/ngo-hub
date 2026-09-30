from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output' / 'pdf' / 'NGO-Hub-Presentation-Cue-Cards.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

cards = [
    ('Introduction', [
        '<b>Open:</b> Good morning. I\'m Omar Hammoud.',
        '<b>Personal connection:</b> Computer Science background + volunteer paramedic, Islamic Medical Association in Saida.',
        '<b>What I see:</b> Ambulance missions, vehicles, equipment, reports - while focusing on helping people.',
        '<b>Why I built it:</b> A real problem I experience as a volunteer.'
    ], 'That is why I built NGO Hub.'),
    ('The idea', [
        '<b>One place:</b> Bring together information spread across messages, papers, files and people.',
        '<b>Organize:</b> Missions, vehicles, medical equipment, staff activity and reports.',
        '<b>Practical:</b> Arabic and English.',
        '<b>Today\'s focus:</b> The feature that can save volunteers and staff time - the AI assistant.'
    ], 'Let me show you how AI can help.'),
    ('Why AI?', [
        '<b>The problem:</b> After a mission or a vehicle problem, someone still has to document what happened.',
        '<b>They already know the information.</b> Turning it into a report takes work.',
        '<b>The approach:</b> Explain naturally instead of completing fields one by one.',
        '<b>The result:</b> AI helps organize that explanation into a draft.'
    ], 'Let me show you a simple example.'),
    ('Demo 1: Vehicle problem', [
        '<b>Set the scene:</b> On duty; notice an ambulance problem.',
        '<b>Example:</b> "Ambulance A03 has broken rear lights. The ambulance is still working, but it should be checked before the next night shift."',
        '<b>Point out:</b> Ambulance + problem + urgency.',
        '<b>Review before submitting.</b> AI helps with paperwork; the person stays in control.'
    ], 'But what happens when information is missing?'),
    ('Demo 2: Missing information', [
        '<b>Example:</b> "We completed the mission and transported the patient safely."',
        '<b>Missing:</b> Mission location. The assistant asks: "Where did the mission take place?"',
        '<b>Flow:</b> I answer; it completes the draft.',
        '<b>Key point:</b> Ask, do not guess. No diagnosis, no medical decisions, no automatic saving without review.'
    ], 'Support the volunteer; respect their judgment.'),
    ('The humanitarian side', [
        '<b>People are the goal.</b> Technology is a tool.',
        '<b>Remember the volunteers:</b> Long shifts, difficult missions - and paperwork still waiting.',
        '<b>The value:</b> Less administrative work means more time and attention for the humanitarian mission.',
        '<b>Emphasize:</b> AI that supports volunteers.'
    ], 'Not AI that replaces volunteers. AI that supports them.'),
    ('Closing', [
        '<b>My journey:</b> A problem I saw as a volunteer became a real application through what I learned in the Digital Hub.',
        '<b>Recap:</b> Organize missions, vehicles, equipment, staff activity and reports; make reporting easier with AI.',
        '<b>Success = impact.</b> Save a few minutes of paperwork... <i>[pause]</i> Keep information organized... <i>[pause]</i> Give the team more time to help someone.'
    ], 'Then the project has done what I wanted it to do. Thank you.'),
]

W, H = landscape(A4)
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('NGO Hub - Presentation Cue Cards')
c.setAuthor('Omar Hammoud')
ink, accent, light = map(HexColor, ['#172B36', '#176B69', '#EEF6F5'])
style = ParagraphStyle('cue', fontName='Helvetica', fontSize=11.7, leading=15, textColor=ink)
transition_style = ParagraphStyle('transition', fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=accent)
margin, gap = 24, 16
card_w = (W - 2*margin - gap)/2
card_h = (H - 76 - gap)/2

for page in range(2):
    c.setFillColor(ink)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(margin, H-21, 'NGO HUB  /  OMAR HAMMOUD')
    c.setFont('Helvetica', 9)
    c.drawRightString(W-margin, H-21, 'PRESENTATION CUE CARDS')
    for slot in range(4):
        index = page*4+slot
        if index >= len(cards):
            continue
        title, items, transition = cards[index]
        x = margin+(slot%2)*(card_w+gap)
        y = H-38-card_h-(slot//2)*(card_h+gap)
        c.setStrokeColor(HexColor('#A8B8BA'))
        c.setLineWidth(.6)
        c.setDash(3, 3)
        c.rect(x, y, card_w, card_h)
        c.setDash()
        c.setFillColor(light)
        c.rect(x+.5, y+card_h-45, card_w-1, 44.5, fill=1, stroke=0)
        c.setFillColor(accent)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(x+14, y+card_h-16, f'SLIDE {index+1} / 7')
        c.setFillColor(ink)
        c.setFont('Helvetica-Bold', 16)
        c.drawString(x+14, y+card_h-35, title)
        cursor = y+card_h-55
        for item in items:
            p = Paragraph(item, style)
            _, ph = p.wrap(card_w-28, card_h)
            p.drawOn(c, x+14, cursor-ph)
            cursor -= ph+6
        p = Paragraph(transition, transition_style)
        _, ph = p.wrap(card_w-28, card_h)
        assert cursor >= y+15+ph+6, (index, cursor-y, ph)
        c.setStrokeColor(HexColor('#D5E2E2'))
        c.line(x+14, y+21+ph, x+card_w-14, y+21+ph)
        p.drawOn(c, x+14, y+13)
    c.setFillColor(HexColor('#59686E'))
    c.setFont('Helvetica', 8)
    c.drawString(margin, 16, 'Print A4 landscape, single-sided, at 100% / actual size. Cut along the dashed borders.')
    c.drawRightString(W-margin, 16, f'{page+1} / 2')
    c.showPage()
c.save()
reader = PdfReader(str(OUT))
assert len(reader.pages) == 2
text = '\n'.join(p.extract_text() for p in reader.pages)
for i in range(1, 8):
    assert f'SLIDE {i} / 7' in text
assert 'Ambulance A03 has broken rear lights.' in text
print(OUT)
