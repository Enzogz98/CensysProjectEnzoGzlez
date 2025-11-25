import io
import PyPDF2
import docx
from odf.opendocument import load
from odf import text


# ==========================================================
#  PDF — extracción optimizada para archivos largos (100+ págs)
# ==========================================================

def extract_pdf(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"PDF corrupto o no legible: {e}")

    content = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except:
            page_text = ""
        content.append(page_text)

    text = "\n".join(content)
    return clean_text(text)


# ==========================================================
# DOCX — lectura directa desde memoria (rápido y estable)
# ==========================================================

def extract_docx(file_bytes: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Error leyendo DOCX: {e}")

    text = "\n".join(para.text for para in doc.paragraphs)
    return clean_text(text)


# ==========================================================
# ODT — usa archivo temp (odfpy necesita ruta física)
# ==========================================================

def extract_odt(file_bytes: bytes) -> str:
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".odt") as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            doc = load(tmp.name)
    except Exception as e:
        raise ValueError(f"Error leyendo ODT: {e}")

    paragraphs = doc.getElementsByType(text.P)

    text = "\n".join(
        p.firstChild.data if (p.firstChild and hasattr(p.firstChild, "data")) else ""
        for p in paragraphs
    )

    return clean_text(text)


# ==========================================================
# Normalización general del texto
# ==========================================================

def clean_text(text: str) -> str:
    """Limpia texto para que el RAG funcione mejor."""
    return (
        text.replace("\x00", "")
            .replace("\t", " ")
            .replace("  ", " ")
            .strip()
    )


# ==========================================================
# Dispatcher general
# ==========================================================

def extract_text(filename: str, file_bytes: bytes) -> str:
    fname = filename.lower().strip()

    if fname.endswith(".pdf"):
        return extract_pdf(file_bytes)

    if fname.endswith(".docx"):
        return extract_docx(file_bytes)

    if fname.endswith(".odt"):
        return extract_odt(file_bytes)

    if fname.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")

    raise ValueError("Formato no soportado. Solo PDF, DOCX, ODT y TXT.")
