# Backend Setup Guide for Document Upload

## Current Error: 500 Internal Server Error on Upload

The upload endpoint is failing because the backend needs proper Google Cloud Storage setup.

## Required Backend Files

### 1. DocumentService.java (Interface)

```java
package com.pulse.fineflux.service;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.pulse.fineflux.domain.*;

import java.io.IOException;

public interface DocumentService {
    String uploadFile(String orgId, MultipartFile file) throws IOException;
    String generateSignedUrl(String orgId, String objectPath, int expirationMinutes);
    Page<DocumentResponse> list(String orgId, Pageable pageable);
    DocumentResponse get(String orgId, String id);
    DocumentResponse create(String orgId, DocumentCreateRequest request);
    DocumentResponse update(String orgId, String id, DocumentUpdateRequest request);
    void delete(String orgId, String id);
}
```

### 2. DocumentServiceImpl.java

```java
package com.pulse.fineflux.service.impl;

import com.google.cloud.storage.*;
import com.pulse.fineflux.service.DocumentService;
import com.pulse.fineflux.domain.*;
import com.pulse.fineflux.entity.Document;
import com.pulse.fineflux.repository.DocumentRepository;
import com.pulse.fineflux.config.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class DocumentServiceImpl implements DocumentService {
    
    @Value("${gcs.bucket-name}")
    private String bucketName;
    
    private final Storage storage;
    private final DocumentRepository documentRepository;
    
    public DocumentServiceImpl(Storage storage, DocumentRepository documentRepository) {
        this.storage = storage;
        this.documentRepository = documentRepository;
    }
    
    @Override
    public String uploadFile(String orgId, MultipartFile file) throws IOException {
        try {
            String originalFilename = file.getOriginalFilename();
            String timestamp = String.valueOf(System.currentTimeMillis());
            String objectName = String.format("%s/%s_%s", orgId, timestamp, originalFilename);
            
            log.info("Uploading to GCS: bucket={}, objectName={}", bucketName, objectName);
            
            BlobId blobId = BlobId.of(bucketName, objectName);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType(file.getContentType())
                    .build();
            
            Blob blob = storage.create(blobInfo, file.getBytes());
            
            // Return the GCS URL in gs:// format
            String fileUrl = String.format("gs://%s/%s", bucketName, objectName);
            log.info("File uploaded successfully: {}", fileUrl);
            
            return fileUrl;
        } catch (Exception e) {
            log.error("Failed to upload file to GCS for orgId={}", orgId, e);
            throw new RuntimeException("Failed to upload file to Google Cloud Storage: " + e.getMessage(), e);
        }
    }
    
    @Override
    public String generateSignedUrl(String orgId, String objectPath, int expirationMinutes) {
        try {
            log.info("Generating signed URL: bucket={}, objectPath={}, expirationMinutes={}", 
                bucketName, objectPath, expirationMinutes);
            
            BlobId blobId = BlobId.of(bucketName, objectPath);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();
            
            URL signedUrl = storage.signUrl(
                blobInfo,
                expirationMinutes,
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature()
            );
            
            log.info("Signed URL generated successfully");
            return signedUrl.toString();
        } catch (Exception e) {
            log.error("Failed to generate signed URL for objectPath={}", objectPath, e);
            throw new RuntimeException("Failed to generate signed URL: " + e.getMessage(), e);
        }
    }
    
    @Override
    public Page<DocumentResponse> list(String orgId, Pageable pageable) {
        return documentRepository.findByOrganizationId(orgId, pageable)
            .map(this::toResponse);
    }
    
    @Override
    public DocumentResponse get(String orgId, String id) {
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
        
        if (!document.getOrganizationId().equals(orgId)) {
            throw new ResourceNotFoundException("Document not found in organization");
        }
        
        return toResponse(document);
    }
    
    @Override
    public DocumentResponse create(String orgId, DocumentCreateRequest request) {
        Document document = new Document();
        document.setOrganizationId(orgId);
        document.setDocumentType(request.getDocumentType());
        document.setIssuingAuthority(request.getIssuingAuthority());
        document.setIssuedDate(request.getIssuedDate());
        document.setExpiryDate(request.getExpiryDate());
        document.setRenewalPeriodDays(request.getRenewalPeriodDays());
        document.setResponsibleParty(request.getResponsibleParty());
        document.setFileUrl(request.getFileUrl());
        document.setNotes(request.getNotes());
        
        Document saved = documentRepository.save(document);
        return toResponse(saved);
    }
    
    @Override
    public DocumentResponse update(String orgId, String id, DocumentUpdateRequest request) {
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
        
        if (!document.getOrganizationId().equals(orgId)) {
            throw new ResourceNotFoundException("Document not found in organization");
        }
        
        document.setDocumentType(request.getDocumentType());
        document.setIssuingAuthority(request.getIssuingAuthority());
        document.setIssuedDate(request.getIssuedDate());
        document.setExpiryDate(request.getExpiryDate());
        document.setRenewalPeriodDays(request.getRenewalPeriodDays());
        document.setResponsibleParty(request.getResponsibleParty());
        document.setNotes(request.getNotes());
        
        Document updated = documentRepository.save(document);
        return toResponse(updated);
    }
    
    @Override
    public void delete(String orgId, String id) {
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
        
        if (!document.getOrganizationId().equals(orgId)) {
            throw new ResourceNotFoundException("Document not found in organization");
        }
        
        documentRepository.delete(document);
    }
    
    private DocumentResponse toResponse(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.setId(document.getId());
        response.setOrganizationId(document.getOrganizationId());
        response.setDocumentType(document.getDocumentType());
        response.setIssuingAuthority(document.getIssuingAuthority());
        response.setIssuedDate(document.getIssuedDate());
        response.setExpiryDate(document.getExpiryDate());
        response.setRenewalPeriodDays(document.getRenewalPeriodDays());
        response.setResponsibleParty(document.getResponsibleParty());
        response.setFileUrl(document.getFileUrl());
        response.setNotes(document.getNotes());
        response.setCreatedAt(document.getCreatedAt());
        response.setUpdatedAt(document.getUpdatedAt());
        return response;
    }
}
```

### 3. GoogleCloudStorageConfig.java

```java
package com.pulse.fineflux.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
@Slf4j
public class GoogleCloudStorageConfig {
    
    @Value("${google.application.credentials}")
    private String credentialsPath;
    
    @Bean
    public Storage storage() throws IOException {
        log.info("Initializing Google Cloud Storage with credentials: {}", credentialsPath);
        
        GoogleCredentials credentials = GoogleCredentials.fromStream(
            new FileInputStream(credentialsPath)
        );
        
        Storage storage = StorageOptions.newBuilder()
            .setCredentials(credentials)
            .build()
            .getService();
        
        log.info("Google Cloud Storage initialized successfully");
        return storage;
    }
}
```

### 4. application.properties

```properties
# Google Cloud Storage Configuration
gcs.bucket-name=pulse-dev
google.application.credentials=/path/to/your/service-account-key.json

# Or use environment variable (recommended for production)
# google.application.credentials=${GOOGLE_APPLICATION_CREDENTIALS}
```

### 5. pom.xml Dependencies

```xml
<!-- Google Cloud Storage -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-storage</artifactId>
    <version>2.30.0</version>
</dependency>
```

## Setup Steps

1. **Get GCS Service Account Key:**
   - Go to Google Cloud Console
   - Navigate to IAM & Admin > Service Accounts
   - Create or select service account
   - Create JSON key
   - Download and save to secure location

2. **Update application.properties:**
   - Set `gcs.bucket-name` to your bucket name (pulse-dev)
   - Set `google.application.credentials` to path of JSON key

3. **Grant Permissions:**
   - Service account needs these roles:
     - Storage Object Admin (for upload/delete)
     - Storage Object Viewer (for read/signed URLs)

4. **Create GCS Bucket:**
   ```bash
   gsutil mb gs://pulse-dev
   ```

5. **Test Upload:**
   - Upload a file through the frontend
   - Check backend logs for success/errors
   - Verify file appears in GCS bucket

## Troubleshooting

### Error: "File upload failed: null"
- Check if `documentService` is null (dependency injection issue)
- Verify `@Service` annotation on DocumentServiceImpl

### Error: "Failed to upload file to Google Cloud Storage"
- Verify service account JSON path is correct
- Check file permissions (read access)
- Ensure service account has Storage Object Admin role

### Error: "The Application Default Credentials are not available"
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Or specify path in application.properties

### Testing Without GCS (Temporary Mock)

For testing, you can temporarily mock the upload in controller:

```java
// TEMPORARY - Remove before production
String fileUrl = String.format("gs://pulse-dev/%s/%d_%s", 
    orgId, System.currentTimeMillis(), file.getOriginalFilename());
```

This will return a mock URL without actually uploading to GCS.
