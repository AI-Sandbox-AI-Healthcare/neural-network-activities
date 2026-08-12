@echo off
echo Starting Neural Network Activities...
echo Open http://localhost:8000 in your browser
echo Press Ctrl+C to stop
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
