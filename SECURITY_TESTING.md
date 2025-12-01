# Redis Security Testing Guide

This document provides security testing procedures for the Redis security enhancements implemented in this branch.

## Overview

The following security features have been implemented:
1. Cache key sanitization and namespace isolation
2. Enhanced Redis connection security (TLS 1.2+, ACL, connection pooling)
3. Session fingerprinting to prevent hijacking
4. Distributed session invalidation via SessionManager
5. Redis-based distributed rate limiting
6. Background job queue system
7. Redis health monitoring

## Pre-Testing Checklist

### Environment Variables

Ensure the following environment variables are configured:

```bash
# Redis Configuration
REDIS_CONNECTION_STRING=<azure-redis-host>:6380,password=<key>,ssl=True
REDIS_USERNAME=default  # For Redis 6.0+ ACL
REDIS_CONNECT_TIMEOUT=10000

# Session Security
NEXTAUTH_SECRET=<strong-random-secret-32-chars>
NEXTAUTH_SECRET_OLD=<previous-secret-during-rotation>  # Optional, for rotation
SESSION_FINGERPRINT_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_ADMIN=true
```

## Security Test Cases

### 1. Cache Poisoning Protection

**Test Objective:** Verify that malicious cache keys are sanitized

```bash
# Test 1: Path traversal attempt
curl "https://app/api/projects?cache_key=../../../etc/passwd"
# Expected: Key should be sanitized to "____etc_passwd" (max 200 chars)

# Test 2: Special characters injection
curl "https://app/api/projects?cache_key=test;rm -rf /"
# Expected: Key should be sanitized to "test_rm__rf_"

# Test 3: Extremely long cache key
curl "https://app/api/projects?cache_key=$(python3 -c 'print(\"A\"*1000)')"
# Expected: Key should be truncated to 200 characters
```

**Validation:**
- Check logs for sanitized keys
- Verify no file system access or command execution
- Confirm cache operations work normally with sanitized keys

### 2. Session Fingerprinting

**Test Objective:** Verify session hijacking protection

```bash
# Test 1: Normal session usage
# Login and get session cookie
SESSION_TOKEN=$(curl -X POST https://app/api/auth/login -c cookies.txt | jq -r '.token')

# Use session normally
curl https://app/api/projects -b cookies.txt
# Expected: Success (200 OK)

# Test 2: Session hijacking attempt (different user agent)
curl https://app/api/projects \
  -H "Cookie: session=$SESSION_TOKEN" \
  -H "User-Agent: HackerBrowser/1.0"
# Expected: Unauthorized (401) if SESSION_FINGERPRINT_ENABLED=true

# Test 3: Session hijacking attempt (different IP)
curl https://app/api/projects \
  -H "Cookie: session=$SESSION_TOKEN" \
  -H "X-Forwarded-For: 1.2.3.4"
# Expected: Unauthorized (401) if SESSION_FINGERPRINT_ENABLED=true
```

**Validation:**
- Check logs for "Session fingerprint mismatch" warnings
- Verify legitimate sessions work normally
- Confirm hijacking attempts are blocked

### 3. Distributed Session Invalidation

**Test Objective:** Verify session invalidation propagates across instances

```bash
# Test 1: Single session invalidation
# Login
curl -X POST https://app/api/auth/login -c cookies.txt

# Logout from specific session
curl -X POST https://app/api/auth/logout -b cookies.txt
# Expected: Session deleted from cache and database

# Try to use invalidated session
curl https://app/api/projects -b cookies.txt
# Expected: Unauthorized (401)

# Test 2: Force logout all sessions
# Login from multiple devices/browsers (get multiple tokens)
TOKEN1=$(curl -X POST https://app/api/auth/login | jq -r '.token')
TOKEN2=$(curl -X POST https://app/api/auth/login | jq -r '.token')

# Force logout user (as admin)
curl -X POST https://app/api/admin/users/{userId}/force-logout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "Security test"}'

# Try to use both tokens
curl https://app/api/projects -H "Cookie: session=$TOKEN1"
# Expected: Unauthorized (401)

curl https://app/api/projects -H "Cookie: session=$TOKEN2"
# Expected: Unauthorized (401)
```

**Validation:**
- Verify all sessions are invalidated
- Check that invalidation works across Container App replicas
- Confirm audit logs show the force logout event

### 4. Redis-Based Rate Limiting

**Test Objective:** Verify rate limiting works across instances

```bash
# Test 1: Normal rate limiting
for i in {1..100}; do
  curl -w "%{http_code}\n" https://app/api/projects \
    -H "X-Forwarded-For: 1.2.3.4"
done
# Expected: First 30 requests succeed (200), then 429 (Too Many Requests)

# Test 2: Check rate limit headers
curl -I https://app/api/projects -H "X-Forwarded-For: 1.2.3.5"
# Expected headers:
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 29
# X-RateLimit-Reset: <timestamp>

# Test 3: Rate limit reset after window
curl https://app/api/projects -H "X-Forwarded-For: 1.2.3.6"
sleep 61  # Wait for rate limit window to expire
curl https://app/api/projects -H "X-Forwarded-For: 1.2.3.6"
# Expected: Success (200)

# Test 4: System admin bypass
curl https://app/api/projects \
  -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
  # Make 100 requests
# Expected: All requests succeed (no rate limiting)
```

**Validation:**
- Verify rate limiting works across multiple Container App instances
- Check that rate limits are enforced correctly
- Confirm admin bypass works when RATE_LIMIT_BYPASS_ADMIN=true
- Verify rate limit headers are present

### 5. Background Job Queue

**Test Objective:** Verify jobs are queued and processed reliably

```bash
# Test 1: Enqueue document extraction job
curl -X POST https://app/api/projects/123/documents/upload \
  -F "file=@test-document.pdf" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Job enqueued, returns job ID

# Test 2: Check job status
curl https://app/api/health/redis -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Queue stats show pending job

# Test 3: Job processing
# Wait for worker to process (or start worker manually)
# Check document status
curl https://app/api/projects/123/documents/456
# Expected: extractionStatus: "COMPLETED"

# Test 4: Job retry on failure
# Intentionally cause a failure (e.g., invalid file path)
# Check that job is retried with exponential backoff
# Expected: Job retries 3 times, then moves to failed queue
```

**Validation:**
- Verify jobs persist across container restarts
- Check that failed jobs are retried with exponential backoff
- Confirm dead letter queue captures permanently failed jobs
- Verify job processing completes successfully

### 6. Connection Security

**Test Objective:** Verify TLS and connection pooling

```bash
# Test 1: Verify TLS version
openssl s_client -connect $REDIS_HOST:6380 -tls1_1
# Expected: Connection fails (TLS 1.1 not allowed)

openssl s_client -connect $REDIS_HOST:6380 -tls1_2
# Expected: Connection succeeds (TLS 1.2 allowed)

# Test 2: Connection pooling
# Monitor Redis connections while under load
redis-cli -h $REDIS_HOST -p 6380 CLIENT LIST
# Expected: Connection count stays stable (no connection leaks)

# Test 3: ACL verification (if Redis 6.0+)
redis-cli -h $REDIS_HOST -p 6380 --user default ACL WHOAMI
# Expected: Shows current user permissions
```

**Validation:**
- Confirm TLS 1.2+ is enforced
- Verify connection pooling limits are respected
- Check ACL configuration (if applicable)

### 7. Redis Health Monitoring

**Test Objective:** Verify health check endpoint works

```bash
# Test 1: Get Redis health
curl https://app/api/health/redis \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Comprehensive health metrics

# Test 2: Verify metrics accuracy
# Expected response structure:
{
  "success": true,
  "data": {
    "redis": {
      "status": "healthy",
      "latency": 5,
      "usedMemory": 1234567,
      "usedMemoryHuman": "1.18 MB",
      "hitRate": 85.5,
      "connectedClients": 5
    },
    "queues": {
      "documents": {
        "pending": 0,
        "processing": 1,
        "failed": 0
      }
    }
  }
}
```

**Validation:**
- Verify health endpoint requires SYSTEM_ADMIN role
- Confirm all metrics are accurate
- Check that health status correctly reflects Redis state

## Performance Testing

### Cache Performance

```bash
# Test cache hit rate
# Warm up cache
for i in {1..100}; do
  curl https://app/api/projects/123 -H "Authorization: Bearer $TOKEN"
done

# Check hit rate via health endpoint
curl https://app/api/health/redis -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.redis.hitRate'
# Expected: > 80% hit rate after warmup
```

### Rate Limiting Performance

```bash
# Test distributed rate limiting across instances
# Use Apache Bench to simulate load
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" https://app/api/projects/

# Check results
# Expected: Consistent rate limiting across all instances
```

### Queue Performance

```bash
# Test queue throughput
# Enqueue 100 jobs
for i in {1..100}; do
  curl -X POST https://app/api/test/enqueue-job -H "Authorization: Bearer $TOKEN"
done

# Monitor processing rate
watch -n 1 'curl -s https://app/api/health/redis -H "Authorization: Bearer $ADMIN_TOKEN" | jq ".data.queues"'
# Expected: Steady processing, no stuck jobs
```

## Security Validation Checklist

- [ ] Cache keys are sanitized (no path traversal, command injection)
- [ ] Session fingerprinting prevents hijacking
- [ ] Session invalidation works across all instances
- [ ] Rate limiting enforced consistently across replicas
- [ ] System admins can bypass rate limits
- [ ] Jobs persist across container restarts
- [ ] Failed jobs retry with exponential backoff
- [ ] TLS 1.2+ enforced for Redis connections
- [ ] Connection pooling prevents resource exhaustion
- [ ] Redis health monitoring accessible to admins only
- [ ] All security logs are generated correctly
- [ ] No sensitive data in cache keys or logs
- [ ] JWT secret rotation supported (with grace period)
- [ ] Dead letter queue captures failed jobs

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Redis Health**
   - Latency < 100ms (healthy), < 500ms (degraded), > 500ms (unhealthy)
   - Memory usage < 80%
   - Cache hit rate > 80%
   - Connected clients stable

2. **Rate Limiting**
   - Rate limit violations per minute
   - False positive rate (legitimate users blocked)

3. **Background Jobs**
   - Queue depth (should not grow indefinitely)
   - Job failure rate < 5%
   - Average processing time per job type
   - Dead letter queue size

4. **Session Security**
   - Session fingerprint mismatches per hour
   - Force logout events
   - Active session count per user

### Alert Thresholds

- Redis latency > 100ms for 5 minutes
- Memory usage > 90%
- Cache hit rate < 70%
- Queue depth > 1000 for 10 minutes
- Job failure rate > 10%
- Session fingerprint mismatches > 10/hour

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis connectivity
redis-cli -h $REDIS_HOST -p 6380 ping

# Check connection count
redis-cli -h $REDIS_HOST -p 6380 CLIENT LIST | wc -l

# Monitor Redis commands
redis-cli -h $REDIS_HOST -p 6380 MONITOR
```

### Rate Limiting Issues

```bash
# Clear rate limits for testing
# (Only in development!)
redis-cli -h $REDIS_HOST -p 6380 KEYS "rl:*" | xargs redis-cli -h $REDIS_HOST -p 6380 DEL
```

### Queue Issues

```bash
# Check stuck jobs
curl https://app/api/admin/queues/cleanup-stuck \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# View failed jobs
redis-cli -h $REDIS_HOST -p 6380 SMEMBERS "queue:documents:failed"

# Retry failed job
curl -X POST https://app/api/admin/queues/retry-job \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"queueName": "documents", "jobId": "job:abc123"}'
```

## Conclusion

This testing guide covers all major security features implemented in the Redis security enhancement. Regular testing and monitoring ensure the system remains secure and performant.

For production deployment:
1. Run all test cases in staging environment
2. Monitor metrics for 24 hours in staging
3. Set up alerts before production deployment
4. Perform gradual rollout with monitoring
5. Keep rollback plan ready







