import io
import PyPDF2
import docx
import tempfile
import os
from odf.opendocument import load
from odf import text, teletype  # <--- IMPORTANTE: teletype extrae texto recursivo

def clean_text(text: str) -> str:
    """Limpieza profunda para normalizar espacios."""
    if not text:
        return ""
    # Reemplazar saltos de línea múltiples por uno solo para mantener estructura pero compacta
    text = text.replace("\r", "\n")
    # Eliminar caracteres nulos
    text = text.replace("\x00", "")
    
    # Opcional: Si el texto viene muy pegado, intentar separar (esto es complejo, 
    # pero aseguramos que los saltos de línea sean espacios si es necesario)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return "\n".join(lines)

def extract_pdf(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"PDF corrupto o no legible: {e}")

    content = []
    for page in reader.pages:
        # extraction_mode="layout" ayuda a veces a mantener espacios visuales
        page_text = page.extract_text() 
        if page_text:
            content.append(page_text)
    
    return clean_text("\n".join(content))

def extract_docx(file_bytes: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Error leyendo DOCX: {e}")

    # Usar separador de nueva línea explícito entre párrafos
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
            
    return clean_text("\n".join(full_text))

def extract_odt(file_bytes: bytes) -> str:
    # ODFPY necesita archivo físico o file-like object bien manejado
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".odt") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        doc = load(tmp_path)
        
        # --- CORRECCIÓN CLAVE ---
        # Usamos teletype para extraer todo el texto de los nodos (incluyendo negritas, spans, etc.)
        all_paragraphs = doc.getElementsByType(text.P)
        extracted = []
        for p in all_paragraphs:
            line = teletype.extractText(p)
            if line.strip():
                extracted.append(line.strip())
                
        os.remove(tmp_path) # Limpieza
        return clean_text("\n".join(extracted))
        
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise ValueError(f"Error leyendo ODT: {e}")

def extract_text(filename: str, file_bytes: bytes) -> str:
    fname = filename.lower().strip()
    
    if fname.endswith(".pdf"):
        return extract_pdf(file_bytes)
    if fname.endswith(".docx"):
        return extract_docx(file_bytes)
    if fname.endswith(".odt"):
        return extract_odt(file_bytes)
    if fname.endswith(".txt"):
        return clean_text(file_bytes.decode("utf-8", errors="ignore"))
    
    return ""