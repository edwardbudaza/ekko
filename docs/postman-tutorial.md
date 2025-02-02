# Testing the Hierarchical Role-Based Permission System with Postman

## Setup

1. Download the Postman collection: [Challenge-Ekko.postman_collection.json]
2. Import the collection into Postman
3. Create an environment with these variables:
   - `baseUrl`: `http://localhost:3000`
   - `token`: (will be filled automatically after login)

## 1. Authentication and User Setup

### Register National Level Admin

```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
    "email": "national_admin@example.com",
    "password": "Admin123!",
    "role": "admin"
}
```

Expected Response:

```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "national-admin-uuid",
    "email": "national_admin@example.com",
    "role": "admin"
  }
}
```

## 2. Creating Hierarchical Structure

### Create National Level Structure

```http
POST {{baseUrl}}/structures
Authorization: Bearer {{token}}
Content-Type: application/json

{
    "name": "Australia Operations",
    "metadata": {
        "level": "NATIONAL",
        "country": "Australia",
        "description": "National level operations"
    }
}
```

### Create City Level Structures

```http
POST {{baseUrl}}/structures
Authorization: Bearer {{token}}
Content-Type: application/json

{
    "name": "Sydney",
    "parentId": "national-uuid",
    "metadata": {
        "level": "CITY",
        "state": "NSW",
        "population": "5.3M"
    }
}
```

Repeat for other cities:

```json
{
  "name": "Melbourne",
  "parentId": "national-uuid",
  "metadata": {
    "level": "CITY",
    "state": "VIC",
    "population": "5.0M"
  }
}
```

### Create Suburb Level Structures

```http
POST {{baseUrl}}/structures
Authorization: Bearer {{token}}
Content-Type: application/json

{
    "name": "Parramatta",
    "parentId": "sydney-uuid",
    "metadata": {
        "level": "SUBURB",
        "postcode": "2150",
        "population": "180K"
    }
}
```

## 3. Creating Users with Different Permission Levels

### Create National Level User

```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
    "email": "national_manager@example.com",
    "password": "User123!",
    "structureId": "national-uuid"
}
```

### Create City Level User

```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
    "email": "sydney_manager@example.com",
    "password": "User123!",
    "structureId": "sydney-uuid"
}
```

### Create Suburb Level User

```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
    "email": "parramatta_manager@example.com",
    "password": "User123!",
    "structureId": "parramatta-uuid"
}
```

## 4. Testing Permission-Based Queries

### National Level Query (Can access all users)

```http
GET {{baseUrl}}/users
Authorization: Bearer {{nationalToken}}
```

Expected Response:

```json
{
  "users": [
    {
      "id": "user1-uuid",
      "email": "sydney_manager@example.com",
      "structureId": "sydney-uuid"
    },
    {
      "id": "user2-uuid",
      "email": "parramatta_manager@example.com",
      "structureId": "parramatta-uuid"
    }
    // ... all other city and suburb users
  ]
}
```

### City Level Query (Can access only city and its suburbs)

```http
GET {{baseUrl}}/users
Authorization: Bearer {{sydneyToken}}
```

Expected Response:

```json
{
  "users": [
    {
      "id": "user2-uuid",
      "email": "parramatta_manager@example.com",
      "structureId": "parramatta-uuid"
    }
    // ... other users in Sydney's suburbs
  ]
}
```

### Suburb Level Query (Can access only suburb users)

```http
GET {{baseUrl}}/users
Authorization: Bearer {{parramattaToken}}
```

Expected Response:

```json
{
  "users": [
    // Only users in Parramatta
  ]
}
```

## 5. Testing Hierarchical Access

### Get Structure Descendants

```http
GET {{baseUrl}}/structures/{{structureId}}/descendants
Authorization: Bearer {{token}}
```

Example response for National level:

```json
[
  {
    "id": "sydney-uuid",
    "name": "Sydney",
    "level": "CITY"
  },
  {
    "id": "melbourne-uuid",
    "name": "Melbourne",
    "level": "CITY"
  },
  {
    "id": "parramatta-uuid",
    "name": "Parramatta",
    "level": "SUBURB"
  }
  // ... all cities and suburbs
]
```

### Get Users in Structure

```http
GET {{baseUrl}}/structures/{{structureId}}/users
Authorization: Bearer {{token}}
```

## 6. Testing Access Control

### Attempt to Access Higher Level

```http
GET {{baseUrl}}/users
Authorization: Bearer {{suburbToken}}
Content-Type: application/json

{
    "structureId": "sydney-uuid"
}
```

Expected Response (403 Forbidden):

```json
{
  "statusCode": 403,
  "message": "Access denied: Insufficient permissions",
  "error": "Forbidden"
}
```

## Testing Checklist

- [ ] Created hierarchical structure (National → City → Suburb)
- [ ] Created users at different levels
- [ ] Verified National level can access all users
- [ ] Verified City level can access only city and suburb users
- [ ] Verified Suburb level can access only suburb users
- [ ] Tested permission inheritance
- [ ] Verified access restrictions
- [ ] Tested structure queries
- [ ] Verified user queries based on structure

## Common Issues and Solutions

1. **Permission Issues**

   - Verify user's structureId is correctly set
   - Check structure hierarchy relationships
   - Ensure proper token for permission level

2. **Structure Creation Issues**

   - Verify parent structure exists
   - Check structure level is valid
   - Ensure proper hierarchy is maintained

3. **Query Issues**
   - Verify user has appropriate access level
   - Check structure exists in hierarchy
   - Ensure proper authorization token

## Performance Testing Notes

For the 100,000 users per day requirement:

1. Test batch user creation
2. Verify query performance with large datasets
3. Test concurrent access patterns
4. Monitor response times across hierarchy levels

Remember: The system should handle flexible hierarchy levels beyond the National/City/Suburb example, so ensure your tests verify this flexibility.
