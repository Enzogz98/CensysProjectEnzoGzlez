import io
import PyPDF2
import docx
from odf.opendocument import load
from odf import text

def extract_pdf(file_bytes: bytes) -> str:
    # Leer PDF desde bytes correctamente
    file_stream = io.BytesIO(file_bytes)
    reader = PyPDF2.PdfReader(file_stream)

    content = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            content.append(page_text)

    return "\n".join(content)

def extract_docx(file_bytes: bytes) -> str:
    file_stream = io.BytesIO(file_bytes)
    document = docx.Document(file_stream)
    return "\n".join(para.text for para in document.paragraphs)

def extract_odt(file_bytes: bytes) -> str:
    file_stream = io.BytesIO(file_bytes)

    # odfpy requiere archivo físico → lo convertimos a temp seguro
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".odt") as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        doc = load(tmp.name)

    paragraphs = doc.getElementsByType(text.P)
    return "\n".join(
        p.firstChild.data if p.firstChild else "" 
        for p in paragraphs
    )

def extract_text(filename: str, file_bytes: bytes) -> str:
    fname = filename.lower()

    if fname.endswith(".pdf"):
        return extract_pdf(file_bytes)

    if fname.endswith(".docx"):
        return extract_docx(file_bytes)

    if fname.endswith(".odt"):
        return extract_odt(file_bytes)

    if fname.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")

    raise ValueError("Formato no soportado. Solo PDF, DOCX, ODT, TXT.")
