# File Upload API Documentation

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following credentials:

```env
# Cloudinary Configuration
CLOUD_NAME=your_cloud_name
API_KEY=your_api_key
API_SECRET=your_api_secret

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Server Configuration
PORT=3000
NODE_ENV=development
```

#### How to get Cloudinary Credentials:

1. Go to [Cloudinary](https://cloudinary.com/)
2. Create a free account
3. Go to Dashboard → Settings
4. Copy your `Cloud Name`, `API Key`, and `API Secret`

---

## API Endpoints

### Brand Profile Logo Upload

#### Upload/Create Brand Logo

**POST** `/api/brand/profile`

**Headers:**

```
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data
```

**Form Data:**

```
- logo: (File) - Brand logo image (jpg, png, jpeg, gif) - Max 5MB
- brandName: (String) - Brand name
- description: (String) - Brand description
- location: (String) - Brand location
- productCategories: (String) - Product categories
- industry: (String) - Industry type
- contactInformation: (String) - Contact information
```

**Example cURL:**

```bash
curl -X POST http://localhost:3000/api/brand/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/logo.png" \
  -F "brandName=My Brand" \
  -F "description=Best brand ever" \
  -F "location=Cairo, Egypt" \
  -F "productCategories=Electronics" \
  -F "industry=Tech" \
  -F "contactInformation=contact@mybrand.com"
```

**Response:**

```json
{
  "message": "Brand profile created successfully",
  "data": {
    "_id": "6...",
    "userId": "5...",
    "brandName": "My Brand",
    "logo": "https://res.cloudinary.com/...",
    "createdAt": "2024-05-08T10:30:00Z",
    "updatedAt": "2024-05-08T10:30:00Z"
  }
}
```

---

#### Update Brand Logo

**PUT** `/api/brand/profile`

**Headers:**

```
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data
```

**Form Data:**

```
- logo: (File) - New brand logo image (Optional)
- brandName: (String) - Updated brand name (Optional)
- description: (String) - Updated description (Optional)
- ... (other fields can be updated)
```

**Example cURL:**

```bash
curl -X PUT http://localhost:3000/api/brand/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/new-logo.png" \
  -F "brandName=Updated Brand Name"
```

---

### Factory Profile Media Upload

#### Upload/Create Factory Profile with Media

**POST** `/api/factory/profile`

**Headers:**

```
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data
```

**Form Data:**

```
- media: (File) - Multiple media files (up to 10) - jpg, png, jpeg, gif, mp4, avi, mov - Max 50MB each
- factoryName: (String) - Factory name
- description: (String) - Factory description
- location: (String) - Factory location
- productCategories: (String) - Product categories
- productionCapacity: (String) - Production capacity
- certifications: (String) - Certifications
- machinery: (String) - Machinery description
```

**Example cURL:**

```bash
curl -X POST http://localhost:3000/api/factory/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@/path/to/image1.jpg" \
  -F "media=@/path/to/image2.png" \
  -F "media=@/path/to/video.mp4" \
  -F "factoryName=My Factory" \
  -F "description=Premium manufacturing" \
  -F "location=Alexandria, Egypt" \
  -F "productCategories=Textiles" \
  -F "productionCapacity=1000 units/day" \
  -F "certifications=ISO 9001" \
  -F "machinery=Modern CNC Machines"
```

**Response:**

```json
{
  "message": "Factory profile created successfully",
  "data": {
    "_id": "6...",
    "userId": "5...",
    "factoryName": "My Factory",
    "media": [
      "https://res.cloudinary.com/.../image1.jpg",
      "https://res.cloudinary.com/.../image2.png",
      "https://res.cloudinary.com/.../video.mp4"
    ],
    "createdAt": "2024-05-08T10:30:00Z",
    "updatedAt": "2024-05-08T10:30:00Z"
  }
}
```

---

#### Update Factory Profile Media

**PUT** `/api/factory/profile`

**Headers:**

```
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data
```

**Form Data:**

```
- media: (File) - New media files to add (Optional)
- factoryName: (String) - Updated factory name (Optional)
- ... (other fields can be updated)
```

**Example cURL:**

```bash
curl -X PUT http://localhost:3000/api/factory/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@/path/to/new-image.jpg" \
  -F "factoryName=Updated Factory Name"
```

---

## Supported File Formats

### Brand Logo

- **Formats:** JPG, PNG, JPEG, GIF
- **Max Size:** 5MB

### Factory Media

- **Formats:** JPG, PNG, JPEG, GIF, MP4, AVI, MOV
- **Max Size:** 50MB per file
- **Max Files:** 10 files per request

---

## Error Handling

### Common Errors

**No authentication token:**

```json
{
  "message": "Unauthorized"
}
```

**File too large:**

```json
{
  "message": "File size too large"
}
```

**Too many files:**

```json
{
  "message": "Too many files"
}
```

**Unsupported format:**

```json
{
  "message": "Invalid file format"
}
```

---

## Frontend Integration Example (JavaScript/React)

```javascript
// Brand Logo Upload
const uploadBrandLogo = async (logoFile, brandData) => {
  const formData = new FormData();
  formData.append("logo", logoFile);
  formData.append("brandName", brandData.brandName);
  formData.append("description", brandData.description);
  formData.append("location", brandData.location);
  formData.append("productCategories", brandData.productCategories);
  formData.append("industry", brandData.industry);
  formData.append("contactInformation", brandData.contactInformation);

  const response = await fetch("http://localhost:3000/api/brand/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

// Factory Media Upload
const uploadFactoryMedia = async (mediaFiles, factoryData) => {
  const formData = new FormData();

  // Add multiple media files
  mediaFiles.forEach((file) => {
    formData.append("media", file);
  });

  formData.append("factoryName", factoryData.factoryName);
  formData.append("description", factoryData.description);
  formData.append("location", factoryData.location);
  formData.append("productCategories", factoryData.productCategories);
  formData.append("productionCapacity", factoryData.productionCapacity);
  formData.append("certifications", factoryData.certifications);
  formData.append("machinery", factoryData.machinery);

  const response = await fetch("http://localhost:3000/api/factory/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};
```

---

## Testing the Endpoints

You can test these endpoints using:

- **Postman:** Import the API endpoints and test with multipart/form-data
- **cURL:** Use the examples provided above
- **Thunder Client:** VS Code extension for API testing
- **Frontend:** Implement the JavaScript examples above

---

## Troubleshooting

1. **"Cloudinary config not found"**
   - Make sure `.env` file exists and has correct Cloudinary credentials
   - Restart the server after adding `.env`

2. **"File upload fails with 400 error"**
   - Check file size limits (5MB for brand, 50MB for factory)
   - Ensure Content-Type is `multipart/form-data`
   - Verify authentication token is valid

3. **"Images not showing up in DB"**
   - Check MongoDB connection in `.env`
   - Verify files were successfully uploaded to Cloudinary
   - Check response contains valid Cloudinary URLs

---

## File Structure

```
FactoryBridge-backend/
├── .env                          # Environment variables (add this)
├── app.js                        # Updated with dotenv
├── middleware/
│   ├── authMiddleware.js
│   └── uploads/
│       └── uploadMiddleware.js   # New file upload middleware
├── models/
│   ├── brandProfile.js
│   ├── factoryProfile.js
│   └── users.js
└── routes/
    ├── auth.js
    ├── brandProfile.js           # Updated with upload
    └── factoryProfile.js         # Updated with upload
```
