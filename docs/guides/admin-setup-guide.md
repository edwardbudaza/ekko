# Admin Setup Guide with Postman

## Prerequisites

- Postman installed
- Application running on `http://localhost:3000`
- Swagger documentation available at `http://localhost:3000/api`

## Step 1: Set Up Postman Environment

1. Create a new environment in Postman:
   - Click "Environments" → "New"
   - Name it "Ekko Local"
   - Add these variables:
     ```
     baseUrl: http://localhost:3000/v1
     adminToken: [leave empty for now]
     adminUserId: [leave empty for now]
     structureId: [leave empty for now]
     ```

## Step 2: Register Admin User

1. Create new request:
   - Method: `POST`
   - URL: `{{baseUrl}}/auth/register`
   - Headers:
     ```
     Content-Type: application/json
     Accept: application/json
     ```
   - Body (raw JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "Admin123!",
       "firstName": "Admin",
       "lastName": "User",
       "role": "admin"
     }
     ```
2. Send request
3. From the response:
   - Copy `accessToken` → Set as `adminToken` in environment
   - Copy `user.id` → Set as `adminUserId` in environment

## Step 3: Create National Structure

1. Create new request:
   - Method: `POST`
   - URL: `{{baseUrl}}/structures`
   - Headers:
     ```
     Authorization: Bearer {{adminToken}}
     Content-Type: application/json
     Accept: application/json
     ```
   - Body (raw JSON):
     ```json
     {
       "name": "National HQ",
       "level": "NATIONAL",
       "parentId": null
     }
     ```
2. Send request
3. From the response:
   - Copy `id` → Set as `structureId` in environment

## Step 4: Link Admin to Structure

1. Create new request:
   - Method: `PUT`
   - URL: `{{baseUrl}}/users/{{adminUserId}}`
   - Headers:
     ```
     Authorization: Bearer {{adminToken}}
     Content-Type: application/json
     Accept: application/json
     ```
   - Body (raw JSON):
     ```json
     {
       "structureId": "{{structureId}}"
     }
     ```
2. Send request

## Step 5: Verify Setup

1. Check Admin User:

   - Method: `GET`
   - URL: `{{baseUrl}}/users/{{adminUserId}}`
   - Headers:
     ```
     Authorization: Bearer {{adminToken}}
     Accept: application/json
     ```

2. Check Structure:
   - Method: `GET`
   - URL: `{{baseUrl}}/structures`
   - Headers:
     ```
     Authorization: Bearer {{adminToken}}
     Accept: application/json
     ```

## Troubleshooting

1. If you get 401 Unauthorized:

   - Check that `adminToken` is set correctly in environment
   - Ensure token includes "Bearer " prefix in Authorization header
   - Try logging in again:

     ```http
     POST {{baseUrl}}/auth/login
     Content-Type: application/json

     {
       "email": "admin@example.com",
       "password": "Admin123!"
     }
     ```

2. If you get 400 Bad Request:

   - Verify JSON syntax is correct
   - Check that all required fields are present
   - Ensure values match expected types (e.g., "NATIONAL" for level)

3. If you get 403 Forbidden:
   - Verify user has admin role
   - Check structure exists
   - Ensure proper hierarchy (NATIONAL → CITY → SUBURB)

## Testing the Setup

After completing the setup, test the full flow:

1. Get all structures:

   ```http
   GET {{baseUrl}}/structures
   Authorization: Bearer {{adminToken}}
   ```

2. Get admin user details:

   ```http
   GET {{baseUrl}}/users/{{adminUserId}}
   Authorization: Bearer {{adminToken}}
   ```

3. Create a city structure:

   ```http
   POST {{baseUrl}}/structures
   Authorization: Bearer {{adminToken}}
   Content-Type: application/json

   {
     "name": "Melbourne City",
     "level": "CITY",
     "parentId": "{{structureId}}"
   }
   ```

## Important Notes

1. Always include these headers:

   - `Authorization: Bearer {{adminToken}}`
   - `Content-Type: application/json` (for POST/PUT)
   - `Accept: application/json`

2. Token format must be:

   - Exactly as received from login/register
   - Prefixed with "Bearer " in Authorization header

3. Structure levels must be:
   - NATIONAL (top level)
   - CITY (under NATIONAL)
   - SUBURB (under CITY)

## Postman Collection

You can create a collection to save all these requests:

1. Click "Collections" → "New Collection"
2. Name it "Ekko API"
3. Add each request to the collection
4. Save collection for future use

## Next Steps

After successful setup:

1. Create additional users for each structure level
2. Test structure hierarchy navigation
3. Verify permissions at each level
4. Set up additional city and suburb structures as needed
