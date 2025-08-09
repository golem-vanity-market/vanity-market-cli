# Everit JIRA Timetracker Plugin API Reference

## Base Information
- **Plugin**: Everit JIRA Timetracker Plugin  
- **Base URL**: `https://jttp-cloud.everit.biz/timetracker/api/latest`
- **Response Format**: JSON (default)

## Authentication
- **Method**: API Token authentication
- **Header**: `X-Everit-API-Key: <your_api_token>`
- **Token Location**: Obtain from "My Preferences" > "REST API" tab in JIRA
- **Admin Requirement**: API Token must be enabled by JIRA admin
- **Deprecated**: JWT authentication (no longer recommended)

## Required Headers
```http
X-Everit-API-Key: <your_api_token>
X-Timezone: <timezone_identifier>  # e.g., Europe/Budapest, Europe/Warsaw
```

## Available Public Endpoints
1. `/public/worklog` - Worklog management
2. `/public/report/details` - Detailed reporting
3. `/public/report/summary` - Summary reporting  
4. `/public/tag` - Tag management ✅ **DOCUMENTED**
5. `/public/working-days` - Working days configuration
6. `/public/non-working` - Non-working days configuration

## Example Request Format
```bash
curl https://jttp-cloud.everit.biz/timetracker/api/latest/public/worklog?worklogId=10000 \
  -H "X-Everit-API-Key: <your_api_token>" \
  -H "X-Timezone: Europe/Warsaw"
```

## Worklog API (`/public/worklog`) - Detailed Specification

### Available Methods:
1. **GET /worklog** - Retrieve single worklog
   - **Parameters**: 
     - `worklogId` (required) - The Everit worklog ID
     - `jiraWorklogId` (optional) - Alternative JIRA worklog ID
   - **Response**: Individual worklog details

2. **POST /worklog** - Create worklog entry
   - **Required Parameters**:
     - `workDate` (required) - Date of work
     - `durationInSeconds` (required) - Time spent in seconds
     - `issueId` (required) - JIRA issue ID
   - **Optional Parameters**:
     - `description` - Work description
     - `isBillable` - Boolean billing flag
     - `workStartTime` - Start time
     - `worklogTagIds` - Array of numeric tag IDs (e.g., [1, 5])

3. **PATCH /worklog** - Update existing worklog
   - **Identification**: `worklogId` or `jiraWorklogId`
   - **Parameters**: Same as POST (partial updates supported)

4. **DELETE /worklog** - Delete worklog
   - **Parameters**: `worklogId` or `jiraWorklogId`

### Authentication Headers:
- `x-everit-api-key` (required) - API token
- `x-timezone` (optional) - Timezone identifier
- `x-everit-on-behalf-account` (optional) - Act on behalf of another user

### ⚠️ **Critical Gap - No Bulk Retrieval API:**
The Worklog API only supports single worklog retrieval by `worklogId`. **This means we cannot directly query for all worklogs by user and date range.**

### Potential Solutions:
1. **Use Report APIs** (`/public/report/details` or `/public/report/summary`)
2. **Iterate through known worklog IDs** (not practical)
3. **Use standard JIRA API** to get worklog IDs, then fetch details from Everit

### Details Report API (`/public/report/details`) - **DOCUMENTED** ✅

**Endpoint**: `POST /public/report/details`

**Key Parameters**:
- **User Filtering**: `users` (array of user account IDs)
  - Example: `"users": ["712020:907c1770-daad-499f-977c-ab455303bdd1"]`
- **Date Range**: 
  - `startDate`: "yyyy-MM-dd" format (e.g., "2025-07-01")
  - `endDate`: "yyyy-MM-dd" format (e.g., "2025-07-31")
- **Pagination**:
  - `startAt`: Index of first result (default: 0)
  - `maxResults`: Max items per page (default: 50)

**Example Request Body**:
```json
{
    "startDate": "2025-07-01",
    "endDate": "2025-07-31", 
    "users": ["712020:907c1770-daad-499f-977c-ab455303bdd1"],
    "maxResults": 100,
    "startAt": 0
}
```

**Response Contains**:
- Total work time aggregated
- Detailed worklog entries with issue/project information
- Pagination metadata

### Summary Report API (`/public/report/summary`) - **DOCUMENTED** ✅

**Endpoint**: `POST /public/report/summary`

**Key Parameters** (All Mandatory):
- **Date Range**: 
  - `startDate`: "yyyy-MM-dd" format (e.g., "2025-07-01")
  - `endDate`: "yyyy-MM-dd" format (e.g., "2025-07-31")
- **Pagination**:
  - `startAt`: Index of first result (required)

**Optional Filtering Parameters**:
- **User Filtering**: `users` (array of user account IDs)
  - Example: `"users": ["712020:907c1770-daad-499f-977c-ab455303bdd1"]`
- **Project Filtering**: `projects` (array of project IDs)
- **Group Filtering**: `groups` (array of user group names)
- **JQL Filtering**: `jql` (JIRA Query Language filter)
- **Billing Filter**: `filterBillable` (boolean for billable/non-billable logs)
- **Tag Filtering**: `tags` (worklog tag filtering)

**Grouping Options**:
- `groupBy` parameter allows result grouping by:
  - Project
  - User  
  - Issue
  - Version
  - Component
  - Billing
  - Tags

**Example Request Body**:
```json
{
    "startDate": "2025-07-01",
    "endDate": "2025-07-31",
    "startAt": 0,
    "users": ["712020:907c1770-daad-499f-977c-ab455303bdd1"],
    "groupBy": ["user", "project"]
}
```

**Response Structure**:
- Contains multiple view arrays (projectView, userView, etc.)
- Includes base metadata about total work time
- Provides detailed breakdown per selected grouping
- More aggregated than details API - better for reporting

**Error Codes**:
- 400: Invalid parameters
- 401: Unauthorized  
- 479: Insufficient permissions
- 567: Worklog sync incomplete

## Project Context
- **Target User**: Wojciech Barczyński (wb@unoperate.com)
- **Account ID**: `712020:907c1770-daad-499f-977c-ab455303bdd1`
- **JIRA Instance**: `https://unoperate.atlassian.net`
- **Target Period**: July 2025 (2025-07-01 to 2025-07-31)
- **Timezone**: Europe/Warsaw

## Implementation Strategy ✅ **UPDATED - TWO OPTIONS AVAILABLE**

**Option 1: Details Report API** (for detailed worklog entries)
**Option 2: Summary Report API** (for aggregated reporting)

### Option 1: Details Report API

```python
import requests

# API Configuration
BASE_URL = "https://jttp-cloud.everit.biz/timetracker/api/latest"
API_TOKEN = "your_api_token_here"  # From environment
ACCOUNT_ID = "712020:907c1770-daad-499f-977c-ab455303bdd1"

# Headers
headers = {
    "X-Everit-API-Key": API_TOKEN,
    "X-Timezone": "Europe/Warsaw",
    "Content-Type": "application/json"
}

# Request for July 2025
payload = {
    "startDate": "2025-07-01",
    "endDate": "2025-07-31",
    "users": [ACCOUNT_ID],
    "maxResults": 1000,  # Adjust as needed
    "startAt": 0
}

response = requests.post(
    f"{BASE_URL}/public/report/details",
    headers=headers,
    json=payload
)
```

### Option 2: Summary Report API

```python
import requests

# API Configuration
BASE_URL = "https://jttp-cloud.everit.biz/timetracker/api/latest"
API_TOKEN = "your_api_token_here"  # From environment
ACCOUNT_ID = "712020:907c1770-daad-499f-977c-ab455303bdd1"

# Headers
headers = {
    "X-Everit-API-Key": API_TOKEN,
    "X-Timezone": "Europe/Warsaw",
    "Content-Type": "application/json"
}

# Request for July 2025 (Summary Report)
payload = {
    "startDate": "2025-07-01",
    "endDate": "2025-07-31",
    "startAt": 0,
    "users": [ACCOUNT_ID],
    "groupBy": ["user", "project", "issue"]  # Optional grouping
}

response = requests.post(
    f"{BASE_URL}/public/report/summary",
    headers=headers,
    json=payload
)
```

**Implementation Steps**:
1. **Primary**: Use Summary Report API for aggregated data (recommended)
2. **Alternative**: Use Details Report API for individual worklog entries
3. **Pagination**: Handle large result sets with startAt parameter
4. **Error Handling**: Implement retry logic and auth error handling
5. **Data Processing**: Transform response into desired JSON format

**API Comparison**:
- **Summary API**: Better for reporting, aggregated data, flexible grouping
- **Details API**: Individual worklog entries, more granular data
- **Both APIs**: Support same date filtering and user filtering

## Security Considerations
- **API Token Protection**: Store in environment variables
- **Rate Limiting**: Implement request throttling
- **Error Handling**: Graceful handling of auth failures
- **Logging**: Avoid logging sensitive tokens

## Next Steps for Complete Implementation
1. **Get API Token**: Obtain from JIRA timetracker plugin preferences
2. **Choose API Endpoint**: 
   - Use `/public/report/summary` for aggregated reporting (recommended)
   - Use `/public/report/details` for individual worklog entries
3. **Test API Connectivity**: Verify authentication and basic functionality
4. **Response Analysis**: Document actual response structures from both APIs
5. **Error Scenarios**: Handle authentication, permissions, and parameter validation errors
6. **Pagination**: Implement proper handling of large result sets

## Recent Updates from Stagil Documentation ✅
- **Summary Report API**: Now fully documented with complete parameter specifications
- **Authentication**: Confirmed `x-everit-api-key` header format (lowercase)  
- **Error Handling**: Documented specific error codes (400, 401, 479, 567)
- **Grouping Options**: Comprehensive list of groupBy parameters available
- **Filtering**: Complete set of optional filtering parameters documented

## Known Issues Resolved ✅
- ✅ **Parameter specifications**: Now documented for Summary API
- ✅ **Response structure**: Basic structure documented  
- ✅ **Date format**: Confirmed "yyyy-MM-dd" format
- ✅ **User identification**: Account ID format confirmed
- ✅ **Error codes**: Specific error scenarios documented

## Remaining Limitations
- **Details API Response**: Need to test actual response structure
- **Rate Limiting**: Specific limits not documented
- **Bulk Operations**: No batch processing capabilities mentioned

## Tag API (`/public/tag`) - **DOCUMENTED** ✅

**Base URL**: `https://jttp-cloud.everit.biz/timetracker/api/latest/public`

### Available Tag Endpoints:

1. **GET /tag** - Get all tags
   - **Query Parameters**:
     - `archived` (optional boolean) - Filter by archive status
   - **Response**: Array of worklog tags with properties:
     - `id` (numeric) - Tag ID for use in worklog entries
     - `name` (string) - Tag name
     - `description` (string) - Tag description
     - `archived` (boolean) - Archive status
     - `colorIndex` (numeric) - Color identifier

2. **POST /tag** - Create new tag
   - **Required Parameters**:
     - `name` (string) - Tag name
   - **Optional Parameters**:
     - `description` (string) - Tag description
     - `colorIndex` (numeric) - Color identifier

3. **PUT /tag/{worklogTagId}** - Update existing tag
4. **DELETE /tag/{worklogTagId}** - Delete tag
5. **POST /tag/{worklogTagId}/archive** - Archive tag
6. **POST /tag/{worklogTagId}/restore** - Restore archived tag

### ⚠️ **Critical: Worklog Tag Format**

**Worklog entries require numeric tag IDs, NOT tag names:**

```json
{
  "worklogTagIds": [1, 5]  // ✅ Correct: Array of numeric IDs
  "worklogTags": ["bug", "backend"]  // ❌ Wrong: Tag names not accepted
}
```

**Implementation Strategy**:
1. Fetch all tags using `GET /public/tag`
2. Map tag names to IDs
3. Use numeric IDs in worklog creation

This memory has been updated with comprehensive API documentation from Stagil Atlassian instance.