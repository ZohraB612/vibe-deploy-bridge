#!/usr/bin/env python3
"""
Test script for DeployHub FastAPI backend
"""

import requests
import json
import time

BASE_URL = "http://localhost:3001"

def test_health_endpoint():
    """Test health check endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_root_endpoint():
    """Test root endpoint"""
    print("\n🔍 Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False

def test_enhanced_deployment():
    """Test enhanced deployment endpoint"""
    print("\n🔍 Testing enhanced deployment...")
    try:
        payload = {
            "project_name": "test-react-app",
            "project_type": "react",
            "environment": "prod",
            "enable_containerization": True,
            "enable_kubernetes": False,
            "enable_monitoring": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/deployment/enhanced",
            json=payload
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            deployment_id = response.json()["deployment_id"]
            print(f"\n⏳ Waiting for deployment to process...")
            time.sleep(2)
            
            # Check deployment status
            status_response = requests.get(f"{BASE_URL}/api/v1/deployment/{deployment_id}")
            print(f"Deployment Status: {json.dumps(status_response.json(), indent=2)}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Enhanced deployment failed: {e}")
        return False

def test_api_documentation():
    """Test API documentation endpoints"""
    print("\n🔍 Testing API documentation...")
    try:
        # Test OpenAPI JSON
        response = requests.get(f"{BASE_URL}/openapi.json")
        print(f"OpenAPI JSON Status: {response.status_code}")
        
        # Test Swagger UI
        response = requests.get(f"{BASE_URL}/docs")
        print(f"Swagger UI Status: {response.status_code}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API documentation test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 DeployHub FastAPI Backend Test Suite")
    print("=" * 50)
    
    tests = [
        test_health_endpoint,
        test_root_endpoint,
        test_enhanced_deployment,
        test_api_documentation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
            print("✅ PASSED")
        else:
            print("❌ FAILED")
        print("-" * 30)
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! FastAPI backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
