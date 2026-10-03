from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/NGO_Hub_Printable_Cue_Cards.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('ArialItalic', 'C:/Windows/Fonts/ariali.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='ArialBold', italic='ArialItalic')

slides = [
('Introduction', [
'Good morning everyone.',
'My name is Omar Hammoud, and this project is actually very personal to me.',
'Alongside my background in Computer Science, I am also a volunteer paramedic with the Islamic Medical Association in Saida.',
'So the idea for NGO Hub did not come only from thinking about what application I could build for my final project. It came from something I actually experience.',
'As volunteers, we go on ambulance missions, use different vehicles and medical equipment, complete reports, and try to keep information organized while also focusing on the most important thing - helping people.',
'That is why I built NGO Hub.'
]),
('The Idea', [
'NGO Hub is a platform designed to make the daily work of a humanitarian healthcare organization easier.',
'Instead of having information spread between messages, papers, different files, or different people, the organization can have one place for its work.',
'It can organize ambulance missions, vehicles, medical equipment, staff activity, and reports.',
'It works in both Arabic and English, because I wanted it to be practical for the people who would actually use it.',
'But I do not want to spend too much time today showing you forms and tables. I want to show you the part of the project that I believe can save volunteers and staff the most time.',
'The AI assistant.'
]),
('Why AI?', [
'When we return from a mission, or when there is a problem with an ambulance, someone still has to document what happened.',
'Usually, that person already knows the information. The problem is turning that information into an organized report.',
'So instead of asking the volunteer to go through many fields one by one, I wanted them to simply explain what happened naturally. The AI helps turn that explanation into an organized draft.',
'Let me show you a simple example.'
]),
('AI Example 1: Vehicle Problem', [
'Imagine I am on duty and I notice a problem with one of our ambulances.',
'Instead of opening a long form and filling everything manually, I can write something simple like:',
'“Ambulance A03 has broken rear lights. The ambulance is still working, but it should be checked before the next night shift.”',
'That is it.',
'From this short message, the assistant understands what I am talking about and prepares the report for me. It identifies the ambulance, what the problem is, and how urgent it is.',
'Then I can review everything before submitting it.',
'The important point is that the AI does not make the decision for us. It helps us with the paperwork. The volunteer or staff member is still the person in control.'
]),
('AI Example 2: Missing Information', [
'The second example is even more important. AI should not invent information.',
'Imagine I write:',
'“We completed the mission and transported the patient safely.”',
'But I forgot to mention where the mission happened. The assistant recognizes that something important is missing. Instead of guessing, it asks me:',
'“Where did the mission take place?”',
'I answer the question, and then it completes the draft.',
'For me, this is an important part of using AI responsibly. The system should help the volunteer, not replace their judgment.',
'It does not diagnose patients. It does not make medical decisions. And it does not automatically save something that the person did not review.'
]),
('The Humanitarian Side', [
'And this is really the main idea behind NGO Hub.',
'When people hear “AI,” sometimes the conversation immediately becomes about the technology. But for this project, the technology is not the goal. The people are the goal.',
'I work with volunteers who give their time to respond to emergencies and help their community. Some of them may finish a long shift or return from a difficult mission and still have administrative work to complete.',
'If technology can reduce even a small part of that work, that means more time and attention can go toward the humanitarian mission itself.',
'That is what I wanted to build. Not AI that replaces volunteers. AI that supports them.'
]),
('Closing', [
'NGO Hub started from a problem that I personally saw as a volunteer. And through what I learned in the Digital Hub, I was able to turn that problem into a real application.',
'Today, it can organize missions, vehicles, equipment, staff activity and reports, while also using AI to make reporting easier.',
'For me, the success of NGO Hub is not measured only by its features, but by the real impact those features can create.',
'If it saves a volunteer a few minutes of paperwork…',
'if it helps information stay organized…',
'and if that gives the team a little more time to focus on helping someone who needs them…',
'then the project has done what I wanted it to do.',
'Thank you.'
])]

W, H = A4
margin = 20
card_w = W / 2
card_h = H / 2
body = ParagraphStyle('body', fontName='Arial', fontSize=11.5, leading=14.25, textColor=colors.HexColor('#161616'))
heading = ParagraphStyle('heading', fontName='ArialBold', fontSize=13, leading=15)
c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('NGO Hub - Printable Presentation Cue Cards')
c.setAuthor('Omar Hammoud')

for page in range(2):
    c.setStrokeColor(colors.HexColor('#A0A0A0'))
    c.setLineWidth(.5)
    c.setDash(4, 4)
    c.line(17, card_h, W-17, card_h)
    c.line(card_w, 17, card_w, H-17)
    c.setDash()
    for slot in range(4):
        idx = page * 4 + slot
        if idx >= len(slides):
            continue
        title, paragraphs = slides[idx]
        top = H - (slot // 2)*card_h
        left = (slot % 2)*card_w
        bottom = top-card_h
        c.setFillColor(colors.HexColor('#505050'))
        c.setFont('ArialBold', 7)
        c.drawString(left+margin, top-22, 'NGO HUB  /  OMAR HAMMOUD')
        c.setFont('Arial', 7)
        c.drawRightString(left+card_w-margin, top-22, f'{idx+1} / 7')
        c.setFillColor(colors.black)
        hp = Paragraph(f'Slide {idx+1} - {title}', heading)
        _, hh = hp.wrap(card_w-2*margin, card_h)
        hp.drawOn(c, left+margin, top-34-hh)
        rule_y = top-41-hh
        c.setStrokeColor(colors.HexColor('#D0D0D0'))
        c.line(left+margin, rule_y, left+card_w-margin, rule_y)
        y = rule_y-10
        for txt in paragraphs:
            markup = escape(txt)
            if txt.startswith('“'):
                markup = '<i>'+markup+'</i>'
            if txt in ('The AI assistant.', 'Thank you.', 'That is why I built NGO Hub.'):
                markup = '<b>'+markup+'</b>'
            p = Paragraph(markup, body)
            _, height = p.wrap(card_w-2*margin, card_h)
            y -= height
            assert y >= bottom+22, (idx+1, y-bottom)
            p.drawOn(c, left+margin, y)
            y -= 5
        print(f'Card {idx+1}: bottom clearance {y-bottom:.1f} pt')
    c.showPage()
c.save()
r = PdfReader(str(OUT))
assert len(r.pages) == 2
full = ' '.join(p.extract_text() for p in r.pages)
normalize = lambda s: ' '.join(s.split())
for title, paragraphs in slides:
    for text in paragraphs:
        assert normalize(text) in normalize(full), text
print(f'Verified all script text across {len(r.pages)} A4 pages: {OUT}')
