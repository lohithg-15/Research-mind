import os
import sys
import logging

# Ensure backend modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

# Load environment variables manually from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                k = key.strip()
                v = val.strip()
                # Do not overwrite if env already has a real key and .env has the placeholder
                if k in os.environ and "your-" in v:
                    continue
                os.environ[k] = v

from backend.clients.claude_client import ClaudeClient

def test_connection():
    print("Initializing client...")
    client = ClaudeClient()
    
    print(f"Detected Provider: {client.provider}")
    
    if client.provider == "mock":
        print("WARNING: Client is running in Mock Mode. Please double check that GEMINI_API_KEY is correctly set in backend/.env")
        return
        
    print("Sending prompt to Gemini API...")
    try:
        import google.generativeai as genai
        genai.configure(api_key=client.gemini_key)
        print("Checking accessible models for this API key:")
        models = [m.name for m in genai.list_models()]
        print(f"Accessible Models: {models}")
        
        # Try a basic model if gemini-pro is not found
        model_to_use = "gemini-pro"
        if "models/gemini-1.5-flash" in models:
            model_to_use = "gemini-1.5-flash"
        elif "models/gemini-pro" in models:
            model_to_use = "gemini-pro"
        else:
            model_to_use = models[0] if models else "gemini-pro"
            
        print(f"Testing text generation with model: {model_to_use}...")
        response = client.complete(
            prompt="Decompose the following research topic into 3 sub-queries: 'quantum error correction'",
            system="You are a planning assistant."
        )
        print("\n--- API Response Success ---")
        print(response)
        print("----------------------------\n")
        print("Your Gemini API key is active and working perfectly!")
    except Exception as e:
        print(f"\nAPI Call Failed: {e}")
        print("\nPossible Reason:")
        print("1. If you get a '404 model not found' or 'API key not valid' error, it means the API key lacks permissions for the Generative Language API.")
        print("2. Please visit Google AI Studio (https://aistudio.google.com/) and create a free Gemini API Key there. AI Studio keys work automatically.")
        print("3. Alternatively, if using Google Cloud Console, ensure you have enabled the 'Generative Language API' for this API key's project.")

if __name__ == "__main__":
    test_connection()
