# Fix Google Cloud Storage Authentication

## Current Issue
Your `DocumentServiceImpl` is trying to use Application Default Credentials but they're not configured, causing the 500 error.

## Solution: Update DocumentServiceImpl Constructor

Replace the constructor in `DocumentServiceImpl.java` with this version that supports both service account JSON and ADC:

```java
public DocumentServiceImpl(
        DocumentRepository documentRepository,
        @Value("${gcs.bucket.name:pulse-dev}") String bucketName,
        @Value("${gcs.project.id:fineflux-dev}") String projectId,
        @Value("${google.application.credentials:}") String credentialsPath
) {
    this.documentRepository = documentRepository;
    this.bucketName = bucketName;
    this.projectId = projectId;
    
    try {
        StorageOptions.Builder builder = StorageOptions.newBuilder()
                .setProjectId(projectId);
        
        // Use service account JSON if path provided
        if (credentialsPath != null && !credentialsPath.isEmpty()) {
            log.info("Loading GCS credentials from: {}", credentialsPath);
            GoogleCredentials credentials = GoogleCredentials.fromStream(
                new FileInputStream(credentialsPath)
            );
            builder.setCredentials(credentials);
        } else {
            log.info("Using Application Default Credentials for GCS");
        }
        
        this.storage = builder.build().getService();
        log.info("DocumentServiceImpl initialized with bucketName={}, projectId={}", bucketName, projectId);
    } catch (Exception e) {
        log.error("Failed to initialize Google Cloud Storage", e);
        throw new RuntimeException("Failed to initialize GCS: " + e.getMessage(), e);
    }
}
```

## Add Import

Add this import at the top of `DocumentServiceImpl.java`:

```java
import com.google.auth.oauth2.GoogleCredentials;
import java.io.FileInputStream;
```

## Update application.properties

Add these properties:

```properties
# Google Cloud Storage
gcs.bucket.name=pulse-dev
gcs.project.id=fineflux-dev
google.application.credentials=/path/to/service-account-key.json
```

## Or Use Environment Variable (Recommended)

Set environment variable in IntelliJ/Eclipse:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Then in application.properties:
```properties
google.application.credentials=${GOOGLE_APPLICATION_CREDENTIALS:}
```

## Quick Test Without GCS

If you want to test the frontend without GCS, temporarily replace the `uploadFile` method:

```java
@Override
public String uploadFile(String organizationId, MultipartFile file) {
    // TEMPORARY MOCK - Remove before production
    String fileName = System.currentTimeMillis() + "_" + sanitizeFileName(file.getOriginalFilename());
    String objectName = organizationId + "/" + fileName;
    String fileUrl = "gs://" + bucketName + "/" + objectName;
    
    log.info("MOCK UPLOAD: Would upload to {}", fileUrl);
    return fileUrl;
}
```

This will return a mock URL without actually uploading to GCS, allowing you to test the rest of your application flow.

## Get Service Account JSON

1. Go to: https://console.cloud.google.com/
2. Select your project: `fineflux-dev`
3. Navigate to: IAM & Admin > Service Accounts
4. Create or select service account
5. Click "Keys" tab → "Add Key" → "Create new key" → JSON
6. Download the JSON file
7. Save it securely (e.g., `C:\gcs-credentials\fineflux-service-account.json`)
8. Update application.properties with the path

## Grant Permissions

Your service account needs these roles:
- **Storage Object Creator** (for upload)
- **Storage Object Viewer** (for signed URLs)
- **Storage Object Admin** (for delete)

Or just use: **Storage Admin** (includes all permissions)

## Verify Bucket Exists

Run in Google Cloud Shell or locally with gcloud CLI:
```bash
gsutil ls gs://pulse-dev
```

If bucket doesn't exist:
```bash
gsutil mb -p fineflux-dev gs://pulse-dev
```
