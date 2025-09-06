# Ridgeline SDK Cloudflare Worker

This Cloudflare Worker provides the SDK endpoints for feature flag retrieval, replacing the NestJS-based server endpoints for improved performance and global distribution.

## Overview

This worker implements the following endpoints from the original SDK controller:
- `POST /sdk/init-server` - Initialize server context
- `POST /sdk/init-client` - Initialize client context  
- `POST /sdk/flags` - Get all flags with evaluation
- `POST /sdk/rules` - Get all flag rules/configurations
- `POST /sdk/flag/:flagKey` - Get specific flag with evaluation

## Architecture

### Authentication
- Uses the same `x-ridgeline-key` header for API key authentication
- Validates API keys against Redis cache
- Supports both SERVER and CLIENT SDK types

### Data Storage
- Connects to Upstash Redis for flag and API key data
- Uses the same Redis key patterns as the original service:
  - Environment flags: `EnvFlag:OrgId:{orgId}:WsId:{workspaceId}:EnvId:{envId}`
  - API keys: `api-key:{keyValue}`

### Flag Evaluation
- Implements basic flag evaluation logic
- Supports context-based flag resolution
- Returns evaluated values for client consumption

## Setup

### Prerequisites
- Cloudflare account with Workers enabled
- Upstash Redis instance
- Node.js 18+ for development

### Installation

```bash
cd worker
npm install
```

### Configuration

Set the required environment variables using Wrangler secrets:

```bash
# Production secrets
wrangler secret put UPSTASH_REDIS_REST_URL --env production
wrangler secret put UPSTASH_REDIS_REST_TOKEN --env production

# Development secrets  
wrangler secret put UPSTASH_REDIS_REST_URL --env development
wrangler secret put UPSTASH_REDIS_REST_TOKEN --env development
```

### Development

```bash
# Start local development server
npm run dev

# Type checking
npm run type-check

# Run tests
npm run test
```

### Deployment

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

## API Endpoints

### POST /sdk/init-server
Initialize server SDK context.

**Headers:**
- `x-ridgeline-key`: API key for authentication
- `Content-Type: application/json`

**Request:**
```json
{
  "sdkContext": {
    "sdkName": "@flagsync/node-sdk",
    "sdkVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "sdkName": "@flagsync/node-sdk", 
  "sdkVersion": "1.0.0"
}
```

### POST /sdk/init-client
Initialize client SDK context.

**Headers:**
- `x-ridgeline-key`: API key for authentication
- `Content-Type: application/json`

**Request:**
```json
{
  "context": {
    "key": "user-123",
    "attributes": {
      "email": "user@example.com",
      "plan": "premium"
    }
  },
  "sdkContext": {
    "sdkName": "@flagsync/js-sdk",
    "sdkVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "key": "user-123",
  "attributes": {
    "email": "user@example.com", 
    "plan": "premium"
  }
}
```

### POST /sdk/flags
Get all flags with evaluation for the given context.

**Headers:**
- `x-ridgeline-key`: API key for authentication
- `Content-Type: application/json`

**Request:**
```json
{
  "context": {
    "key": "user-123",
    "attributes": {
      "plan": "premium"
    }
  }
}
```

**Response:**
```json
{
  "flags": {
    "feature_x": true,
    "max_widgets": 10,
    "theme": "dark"
  },
  "context": {
    "key": "user-123",
    "attributes": {
      "plan": "premium" 
    }
  }
}
```

### POST /sdk/rules
Get all flag rules/configurations without evaluation.

**Headers:**
- `x-ridgeline-key`: API key for authentication
- `Content-Type: application/json`

**Request:**
```json
{
  "sdkContext": {
    "sdkName": "@flagsync/node-sdk",
    "sdkVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "flags": {
    "feature_x": {
      "flagKey": "feature_x",
      "defaultValue": false,
      "variants": [...],
      "rules": [...]
    }
  },
  "placeholder": []
}
```

### POST /sdk/flag/:flagKey
Get specific flag with evaluation.

**Headers:**
- `x-ridgeline-key`: API key for authentication  
- `Content-Type: application/json`

**Request:**
```json
{
  "context": {
    "key": "user-123",
    "attributes": {
      "plan": "premium"
    }
  }
}
```

**Response:**
```json
{
  "flag": {
    "feature_x": true
  },
  "context": {
    "key": "user-123",
    "attributes": {
      "plan": "premium"
    }
  }
}
```

## Error Handling

The worker returns appropriate HTTP status codes:
- `401 Unauthorized` - Invalid or missing API key
- `400 Bad Request` - Invalid request format or SDK validation errors
- `404 Not Found` - Unknown endpoint or flag not found
- `405 Method Not Allowed` - Non-POST requests (except OPTIONS for CORS)
- `500 Internal Server Error` - Unexpected errors

## CORS Support

The worker includes CORS headers to support browser-based SDK usage:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, x-ridgeline-key, x-ridgeline-user-ctx, x-ridgeline-sdk-ctx`

## Performance Considerations

- Uses Upstash Redis REST API for data access
- Minimal external dependencies 
- Optimized for Cloudflare's V8 isolate runtime
- Global distribution via Cloudflare's edge network

## Migration Notes

### Missing Features
The following features from the original NestJS service are not yet implemented:
- Usage tracking (`RedisUsageMetricPutterService`)
- Custom attribute handling (`RedisCustomAttributePutterService`) 
- AMQP messaging (`AmqpService`)
- Advanced flag evaluation logic (`SdkEvalEngineService`)

### TODO Items
- [ ] Implement usage metrics tracking
- [ ] Add custom attribute processing
- [ ] Implement advanced flag evaluation rules
- [ ] Add comprehensive logging
- [ ] Add request/response validation
- [ ] Implement rate limiting
- [ ] Add health check endpoint
- [ ] Add monitoring and alerting

## License

This code is part of the Ridgeline feature flag system.