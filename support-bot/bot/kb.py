"""База знаний демо-клиники. DEMO: компания и цены вымышленные, показывают механику бота, а не реальную клинику.
Каждая запись: id, ключевые слова на нескольких языках (для поиска), ответ по-английски (модель переводит на язык клиента)."""
import re

COMPANY = "Clínica Sorriso Porto (DEMO)"

ENTRIES = [
    {"id": "hours", "kw": ["hours", "open", "opening", "horário", "aberto", "abre", "godziny", "otwarte", "часы", "график", "работаете", "открыты", "години"],
     "answer": "Opening hours: Monday to Friday 09:00-19:00, Saturday 09:00-13:00 (by appointment), closed on Sunday and public holidays."},
    {"id": "location", "kw": ["address", "where", "location", "parking", "morada", "onde", "estacionamento", "adres", "gdzie", "parking", "адрес", "где", "парковка"],
     "answer": "Address: Rua das Flores 123, 4050 Porto (demo address). Paid street parking nearby and a public car park 150 m away. Metro: Trindade (5 minutes on foot)."},
    {"id": "cleaning", "kw": ["cleaning", "scaling", "hygiene", "limpeza", "destartarização", "higiene", "czyszczenie", "scaling", "higienizacja", "чистка", "гигиена", "налет"],
     "answer": "Professional dental cleaning (hygiene visit, about 45 minutes): 55 EUR. Includes scaling, polishing and a short check-up."},
    {"id": "whitening", "kw": ["whitening", "bleaching", "branqueamento", "wybielanie", "wybielania", "отбеливание"],
     "answer": "Teeth whitening in the clinic (one 60-minute session): 180 EUR. A short check-up first is required (included)."},
    {"id": "checkup", "kw": ["check-up", "checkup", "first visit", "consultation", "consulta", "primeira", "konsultacja", "pierwsza", "осмотр", "консультация", "первый"],
     "answer": "First visit with examination and treatment plan (30 minutes): 30 EUR. If you continue treatment with us, the fee is deducted from the treatment."},
    {"id": "implants", "kw": ["implant", "implants", "implante", "implanty", "имплант", "имплантация"],
     "answer": "Dental implants: price depends on the case. A specialist consultation with a 3D scan (80 EUR) is needed first. The exact quote is given by the doctor after the scan."},
    {"id": "children", "kw": ["children", "child", "kids", "criança", "crianças", "dzieci", "dziecko", "дети", "ребенок", "ребёнок", "детей"],
     "answer": "We treat children from 4 years old. Children's check-up 25 EUR. A parent or guardian must be present."},
    {"id": "booking", "kw": ["book", "appointment", "schedule", "marcar", "marcação", "agendar", "consulta", "umówić", "wizyta", "termin", "записаться", "запись", "записать"],
     "answer": "Appointments are booked here or by phone (+351 220 000 000, demo number). Usually there are free slots within 2-3 working days. To book we need: name, service, preferred day and time, and a contact (phone or WhatsApp)."},
    {"id": "cancel", "kw": ["cancel", "reschedule", "cancelar", "remarcar", "odwołać", "przełożyć", "отменить", "перенести"],
     "answer": "Free cancellation or rescheduling up to 24 hours before the visit. Later cancellations may be charged 20 EUR."},
    {"id": "payment", "kw": ["payment", "pay", "card", "insurance", "pagamento", "seguro", "cartão", "płatność", "ubezpieczenie", "karta", "оплата", "страховка", "карта"],
     "answer": "Payment by card, cash or MB Way after the visit. We work with several private insurance plans; for details about your plan a human colleague will confirm."},
    {"id": "languages", "kw": ["language", "speak", "english", "polish", "russian", "língua", "idioma", "język", "po polsku", "язык", "по-русски", "по-польски"],
     "answer": "Staff and this assistant speak Portuguese, English, Polish, Russian and Ukrainian."},
    {"id": "emergency", "kw": ["pain", "emergency", "urgent", "bleeding", "swelling", "dor", "urgência", "sangramento", "ból", "pilne", "krwawienie", "боль", "срочно", "кровь", "опухоль"],
     "answer": "For severe pain, swelling, bleeding or a knocked-out tooth we do not give advice in chat: a human colleague calls you urgently. Out of hours call 112 for real emergencies."},
]


def _tokens(text):
    return set(re.findall(r"[\w'-]+", text.lower()))


def search(text, limit=4):
    """Простой поиск по ключевым словам (подстрока: «wybielanie» найдёт «wybielania»). Возвращает записи, у которых хоть одно слово совпало, лучшие первыми."""
    low = text.lower()
    toks = _tokens(text)
    scored = []
    for e in ENTRIES:
        hits = 0
        for k in e["kw"]:
            if " " in k:
                hits += 2 if k in low else 0
            elif k in toks or any(t.startswith(k[:5]) and len(k) >= 5 and t.startswith(k[:5]) for t in toks):
                hits += 1
        if hits:
            scored.append((hits, e))
    scored.sort(key=lambda x: -x[0])
    return [e for _, e in scored[:limit]]


def numbers(text):
    """Все числа (цены, часы) в тексте как строки без разделителей: для проверки, что бот ничего не придумал."""
    return set(re.findall(r"\d+(?:[.,]\d+)?", text))


def all_text():
    return " ".join(e["answer"] for e in ENTRIES)
