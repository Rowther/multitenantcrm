#!/usr/bin/env python3
"""
Script to verify that performance optimizations are working correctly
"""

import requests
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

def test_backend_performance():
    """Test backend API response times"""
    print("Testing backend performance...")
    
    # Test multiple endpoints
    endpoints = [
        "/docs",
        "/api/companies",
        "/api/users/me"
    ]
    
    results = []
    for endpoint in endpoints:
        try:
            start_time = time.time()
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            results.append({
                "endpoint": endpoint,
                "status_code": response.status_code,
                "response_time_ms": round(response_time, 2)
            })
            
            print(f"  {endpoint}: {response.status_code} - {response_time:.2f}ms")
        except Exception as e:
            print(f"  {endpoint}: ERROR - {str(e)}")
            results.append({
                "endpoint": endpoint,
                "status_code": "ERROR",
                "response_time_ms": 0
            })
    
    return results

def test_concurrent_requests():
    """Test concurrent request handling"""
    print("\nTesting concurrent requests...")
    
    def make_request():
        try:
            start_time = time.time()
            response = requests.get("http://localhost:8000/docs", timeout=5)
            end_time = time.time()
            return {
                "status": "SUCCESS",
                "response_time": (end_time - start_time) * 1000
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    # Make 10 concurrent requests
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        results = [future.result() for future in as_completed(futures)]
    
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    avg_response_time = sum(float(r["response_time"]) for r in results if r["status"] == "SUCCESS") / success_count if success_count > 0 else 0
    
    print(f"  Successful requests: {success_count}/10")
    print(f"  Average response time: {avg_response_time:.2f}ms")
    
    return {
        "success_count": success_count,
        "total_requests": 10,
        "average_response_time_ms": round(avg_response_time, 2)
    }

def test_health_endpoints():
    """Test health check endpoints"""
    print("\nTesting health endpoints...")
    
    health_endpoints = [
        "/health",
        "/health/simple",
        "/health/ready"
    ]
    
    results = []
    for endpoint in health_endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            results.append({
                "endpoint": endpoint,
                "status_code": response.status_code,
                "working": response.status_code in [200, 503]  # 503 is valid for unhealthy state
            })
            print(f"  {endpoint}: {response.status_code} - {'✓' if response.status_code in [200, 503] else '✗'}")
        except Exception as e:
            print(f"  {endpoint}: ERROR - {str(e)}")
            results.append({
                "endpoint": endpoint,
                "status_code": "ERROR",
                "working": False
            })
    
    return results

def check_environment_variables():
    """Check if performance-related environment variables are set"""
    print("\nChecking environment variables...")
    
    backend_env_path = os.path.join("backend", ".env")
    if os.path.exists(backend_env_path):
        with open(backend_env_path, 'r') as f:
            backend_env = f.read()
        
        checks = [
            ("WEB_CONCURRENCY=8", "Workers configuration" in backend_env),
            ("maxPoolSize=100", "MongoDB connection pooling" in backend_env),
            ("CACHE_TTL = 600", "Extended cache TTL" in backend_env)
        ]
        
        for check, description in checks:
            status = "✓" if check in backend_env else "✗"
            print(f"  {description}: {status}")
        
        return checks
    else:
        print("  Backend .env file not found")
        return []

def main():
    print("=" * 60)
    print("    Performance Optimization Verification")
    print("=" * 60)
    
    # Check environment variables
    env_checks = check_environment_variables()
    
    # Test backend performance
    backend_results = test_backend_performance()
    
    # Test concurrent requests
    concurrent_results = test_concurrent_requests()
    
    # Test health endpoints
    health_results = test_health_endpoints()
    
    # Summary
    print("\n" + "=" * 60)
    print("    PERFORMANCE SUMMARY")
    print("=" * 60)
    
    # Performance metrics
    avg_response_time = sum(r["response_time_ms"] for r in backend_results if isinstance(r["response_time_ms"], (int, float))) / len(backend_results)
    print(f"Average API response time: {avg_response_time:.2f}ms")
    
    if avg_response_time < 100:
        print("✅ API performance: Excellent (< 100ms)")
    elif avg_response_time < 200:
        print("⚠️  API performance: Good (100-200ms)")
    else:
        print("❌ API performance: Needs improvement (> 200ms)")
    
    # Concurrent request handling
    success_rate = (concurrent_results["success_count"] / concurrent_results["total_requests"]) * 100
    print(f"Concurrent request success rate: {success_rate:.0f}%")
    
    if success_rate == 100:
        print("✅ Concurrent requests: Excellent (10/10)")
    elif success_rate >= 80:
        print("⚠️  Concurrent requests: Good (≥ 8/10)")
    else:
        print("❌ Concurrent requests: Needs improvement (< 8/10)")
    
    # Health endpoints
    health_working = all(r["working"] for r in health_results)
    if health_working:
        print("✅ Health endpoints: All working")
    else:
        print("❌ Health endpoints: Some not working")
    
    print("\nRecommendations:")
    if avg_response_time >= 100:
        print("  - Review API endpoint complexity")
        print("  - Check database query performance")
    
    if success_rate < 100:
        print("  - Check server resource allocation")
        print("  - Consider reducing WEB_CONCURRENCY if memory is limited")
    
    print("\nFor detailed optimization guide, see PERFORMANCE_OPTIMIZATION.md")

if __name__ == "__main__":
    main()