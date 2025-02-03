# Step-by-Step Guide: Setting Up Your Hierarchical Structure System

This guide will walk you through the process of setting up your hierarchical structure system from scratch, including creating an admin user, setting up structures, and managing users.

## 1. Initial Setup: Creating an Admin User

First, you need to create an admin user who will have full system access.

### Register Admin User

**Endpoint**: `POST /auth/register`

1. Open Swagger UI at `http://localhost:3000/api`
2. Expand the `Auth` section
3. Find `POST /auth/register`
4. Use this request body:

```json
{
  "email": "admin@example.com",
  "password": "Admin123!",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```

5. Expected Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

### Authorize in Swagger

1. Click the "Authorize" button at the top
2. Enter: `Bearer your_access_token`
3. Click "Authorize"

## 2. Creating the Hierarchical Structure

After setting up the admin user, create your organizational structure from top to bottom.

### Create National Level Structure

**Endpoint**: `POST /structures`

1. Expand the `Structures` section
2. Find `POST /structures`
3. Use this request body:

```json
{
  "name": "National Headquarters",
  "level": "NATIONAL",
  "metadata": {
    "description": "Top level organization structure",
    "type": "headquarters"
  }
}
```

4. Expected Response:

```json
{
  "id": "national-uuid",
  "name": "National Headquarters",
  "level": "NATIONAL",
  "metadata": {
    "description": "Top level organization structure",
    "type": "headquarters"
  }
}
```

### Create City Level Structures

**Endpoint**: `POST /structures`

1. Use this request body (replace `national-uuid` with the actual UUID from above):

```json
{
  "name": "Sydney Office",
  "level": "CITY",
  "parentId": "national-uuid",
  "metadata": {
    "description": "Sydney city operations",
    "region": "NSW"
  }
}
```

2. Repeat for other cities as needed

### Create Suburb Level Structures

**Endpoint**: `POST /structures`

1. Use this request body (replace `city-uuid` with the actual city UUID):

```json
{
  "name": "Parramatta Branch",
  "level": "SUBURB",
  "parentId": "city-uuid",
  "metadata": {
    "description": "Parramatta local operations",
    "postcode": "2150"
  }
}
```

## 3. Verifying Structure Hierarchy

### View All Structures

**Endpoint**: `GET /structures`

1. Use `GET /structures` to see all created structures
2. Expected Response:

```json
[
  {
    "id": "national-uuid",
    "name": "National Headquarters",
    "level": "NATIONAL",
    "children": [
      {
        "id": "city-uuid",
        "name": "Sydney Office",
        "level": "CITY",
        "children": [
          {
            "id": "suburb-uuid",
            "name": "Parramatta Branch",
            "level": "SUBURB"
          }
        ]
      }
    ]
  }
]
```

### View Structure Descendants

**Endpoint**: `GET /structures/{id}/descendants`

1. Use the national structure's UUID to see all descendants:
   `GET /structures/national-uuid/descendants`

## 4. Creating Users for Each Level

### Create National Level User

**Endpoint**: `POST /users`

1. Use this request body:

```json
{
  "email": "national@example.com",
  "password": "National123!",
  "firstName": "National",
  "lastName": "Manager",
  "role": "national",
  "structureId": "national-uuid"
}
```

### Create City Level User

**Endpoint**: `POST /users`

1. Use this request body:

```json
{
  "email": "sydney@example.com",
  "password": "Sydney123!",
  "firstName": "Sydney",
  "lastName": "Manager",
  "role": "city",
  "structureId": "city-uuid"
}
```

### Create Suburb Level User

**Endpoint**: `POST /users`

1. Use this request body:

```json
{
  "email": "parramatta@example.com",
  "password": "Parramatta123!",
  "firstName": "Parramatta",
  "lastName": "Manager",
  "role": "suburb",
  "structureId": "suburb-uuid"
}
```

## 5. Testing Access Control

1. **Login as National User**

   - Use `POST /auth/login` with national user credentials
   - Can view all structures and users

2. **Login as City User**

   - Use `POST /auth/login` with city user credentials
   - Can only view city and its suburb structures/users

3. **Login as Suburb User**
   - Use `POST /auth/login` with suburb user credentials
   - Can only view suburb structure/users

## Common Issues and Solutions

### Structure Creation Issues

1. **Invalid Parent Structure**

   - Ensure parent structure exists
   - Verify parent structure UUID is correct
   - Check structure level hierarchy is valid

2. **Permission Issues**
   - Verify you're using admin token
   - Check token hasn't expired
   - Ensure proper role assignment

### User Creation Issues

1. **Invalid Structure Assignment**

   - Verify structure exists
   - Check structure UUID is correct
   - Ensure role matches structure level

2. **Role Assignment Issues**
   - Verify role matches structure level
   - Check role spelling (admin, national, city, suburb)
   - Ensure proper capitalization

## Next Steps

After completing this setup:

1. Implement additional security measures
2. Set up monitoring and alerts
3. Configure backup procedures
4. Document structure changes
5. Train users on access patterns

Remember to always use secure passwords and follow the principle of least privilege when assigning roles and permissions.
