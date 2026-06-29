import os
from sqlalchemy.orm import Session
from models.apprentice import Apprentice
from models.user import User

try:
    from weasyprint import HTML
except ImportError:
    HTML = None

def generate_apprentice_pdf(apprentice_id: int, db: Session) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, f"apprentice_{apprentice_id}_report.pdf")
    
    html_content = f"<h1>Apprentice Report for ID {apprentice_id}</h1>"
    if HTML:
        HTML(string=html_content).write_pdf(pdf_path)
    else:
        with open(pdf_path, "w") as f:
            f.write("Weasyprint not installed. This is a dummy PDF.")
    return pdf_path

def generate_summary_pdf(db: Session) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, "programme_summary.pdf")
    
    html_content = "<h1>Programme Summary</h1>"
    if HTML:
        HTML(string=html_content).write_pdf(pdf_path)
    else:
        with open(pdf_path, "w") as f:
            f.write("Weasyprint not installed. This is a dummy PDF.")
    return pdf_path
