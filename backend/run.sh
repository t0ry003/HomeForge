echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🔄 Applying database migrations..."
bash migrate.sh

echo "🚀 Starting development server..."
python manage.py runserver 0.0.0.0:8000
