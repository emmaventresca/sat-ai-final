#!/usr/bin/env python3
"""
Teacher planner service: generates beautiful PDF worksheets from question IDs.

Run this server on localhost:8791 for the teacher portal to use.
The React app will POST: { exam, question_ids, brief }
This returns: { worksheet_html, answer_key_html, question_count }
"""

from flask import Flask, request, jsonify
from pathlib import Path
import json
import sys
from datetime import datetime

app = Flask(__name__)

# Load question bank
def load_questions(exam: str) -> dict:
    """Load questions from the public data folder."""
    data_path = Path(__file__).parent.parent / "apps/web/public/data" / f"{exam}/questions.json"
    if not data_path.exists():
        return {}
    with open(data_path) as f:
        return json.load(f)

def get_question(exam: str, q_id: str, questions: dict):
    """Fetch a single question by ID."""
    for q in questions.values() if isinstance(questions, dict) else questions:
        if isinstance(q, dict) and q.get("id") == q_id:
            return q
    return None

@app.route("/worksheet", methods=["POST"])
def worksheet():
    """Generate worksheet HTML and answer key from question IDs."""
    try:
        data = request.json
        exam = data.get("exam", "sat")
        question_ids = data.get("question_ids", [])
        brief = data.get("brief", "Worksheet")

        if not question_ids:
            return jsonify({"error": "No questions provided"}), 400

        questions_bank = load_questions(exam)
        if not questions_bank:
            return jsonify({"error": f"Question bank not found for {exam}"}), 404

        # Fetch questions
        questions = []
        for qid in question_ids:
            q = get_question(exam, qid, questions_bank)
            if q:
                questions.append(q)

        if not questions:
            return jsonify({"error": "No questions found"}), 404

        # Generate worksheet HTML
        worksheet_html = generate_worksheet(questions, brief, exam)
        answer_key_html = generate_answer_key(questions, exam)

        return jsonify({
            "exam": exam,
            "title": brief,
            "question_count": len(questions),
            "worksheet_html": worksheet_html,
            "answer_key_html": answer_key_html,
            "notes": [f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_worksheet(questions: list, title: str, exam: str) -> str:
    """Generate beautiful worksheet HTML."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
        <style>
            * {{ margin: 0; padding: 0; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 40px;
                max-width: 8.5in;
                margin: 0 auto;
            }}
            @page {{ size: letter; margin: 0.5in; }}
            @media print {{
                body {{ padding: 0; }}
                .page-break {{ page-break-after: always; }}
            }}
            h1 {{
                font-size: 28px;
                color: #1f2419;
                margin-bottom: 8px;
                border-bottom: 3px solid #5d7444;
                padding-bottom: 12px;
            }}
            .meta {{
                color: #666;
                font-size: 13px;
                margin-bottom: 24px;
            }}
            .question {{
                margin: 24px 0 32px;
                padding: 16px;
                background: #f9f7f4;
                border-left: 3px solid #b57d37;
                border-radius: 4px;
            }}
            .q-num {{
                font-weight: 700;
                color: #1f2419;
                display: inline-block;
                margin-right: 8px;
            }}
            .q-stem {{
                margin: 12px 0;
                font-size: 15px;
            }}
            .q-choices {{
                margin-top: 12px;
            }}
            .choice {{
                margin: 8px 0;
                padding: 8px 12px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 3px;
            }}
            .choice-letter {{
                font-weight: 600;
                margin-right: 8px;
                color: #5d7444;
            }}
        </style>
    </head>
    <body>
        <h1>{title}</h1>
        <div class="meta">
            <strong>{exam.upper()}</strong> • {len(questions)} questions • {datetime.now().strftime('%B %d, %Y')}
        </div>
    """

    for i, q in enumerate(questions, 1):
        html += f"""
        <div class="question">
            <div>
                <span class="q-num">{i}.</span>
                <span class="q-stem">{q.get('stem', 'No stem')}</span>
            </div>
        """

        # Add choices if multiple choice
        if q.get("format") == "choice":
            choices = q.get("choices", [])
            html += '<div class="q-choices">'
            for j, choice in enumerate(choices):
                letter = chr(65 + j)  # A, B, C, D
                html += f'<div class="choice"><span class="choice-letter">{letter}</span>{choice}</div>'
            html += '</div>'

        html += '</div>'

    html += """
    </body>
    </html>
    """
    return html

def generate_answer_key(questions: list, exam: str) -> str:
    """Generate answer key HTML."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Answer Key</title>
        <style>
            * {{ margin: 0; padding: 0; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.8;
                color: #333;
                background: white;
                padding: 40px;
                max-width: 8.5in;
                margin: 0 auto;
            }}
            @media print {{
                body {{ padding: 0; }}
            }}
            h1 {{
                font-size: 24px;
                color: #1f2419;
                margin-bottom: 8px;
                border-bottom: 3px solid #5d7444;
                padding-bottom: 12px;
            }}
            .answer {{
                display: inline-block;
                margin: 12px 24px 12px 0;
                padding: 8px 12px;
                background: #f0f4ed;
                border-radius: 4px;
                font-weight: 600;
                color: #1f2419;
            }}
            .answer-num {{
                color: #666;
                font-weight: 400;
                margin-right: 8px;
            }}
        </style>
    </head>
    <body>
        <h1>Answer Key</h1>
    """

    for i, q in enumerate(questions, 1):
        answer = q.get("answer", "?")
        html += f'<div class="answer"><span class="answer-num">{i}.</span>{answer}</div>'

    html += """
    </body>
    </html>
    """
    return html

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
    print(f"🎓 Planner service running on http://localhost:{port}")
    print("POST /worksheet with {{ exam, question_ids, brief }}")
    app.run(host="127.0.0.1", port=port, debug=True)
