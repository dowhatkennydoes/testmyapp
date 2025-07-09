#!/usr/bin/env python3
"""
Test script to verify DeviseOS Backend setup
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")
    
    try:
        from deviseos.core.config import get_settings
        print("✓ Core config imported successfully")
        
        settings = get_settings()
        print(f"✓ Settings loaded: {settings.app_name} v{settings.version}")
        
        from deviseos.api.app_simple import app
        print("✓ Simple app imported successfully")
        
        return True
    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False


def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")
    
    try:
        from deviseos.core.config import get_settings
        settings = get_settings()
        
        print(f"✓ App name: {settings.app_name}")
        print(f"✓ Version: {settings.version}")
        print(f"✓ Environment: {settings.environment}")
        print(f"✓ Debug: {settings.debug}")
        print(f"✓ Host: {settings.host}")
        print(f"✓ Port: {settings.port}")
        
        return True
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        return False


def test_app_creation():
    """Test FastAPI app creation"""
    print("\nTesting app creation...")
    
    try:
        from deviseos.api.app_simple import app
        
        print(f"✓ App title: {app.title}")
        print(f"✓ App version: {app.version}")
        print(f"✓ OpenAPI docs: {app.docs_url}")
        
        return True
    except Exception as e:
        print(f"✗ App creation test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("DeviseOS Backend Setup Test")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_config,
        test_app_creation,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 40)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("✓ All tests passed! Setup is ready.")
        print("\nTo start the server, run:")
        print("  python main_simple.py")
        print("  # or")
        print("  uvicorn deviseos.api.app_simple:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("✗ Some tests failed. Please check the setup.")
        sys.exit(1)


if __name__ == "__main__":
    main() 