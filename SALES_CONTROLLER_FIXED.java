package com.pulse.fineflux.controller;

import com.pulse.fineflux.domain.SalesCreateDTO;
import com.pulse.fineflux.domain.SalesResponseDTO;
import com.pulse.fineflux.domain.SalesUpdateDTO;
import com.pulse.fineflux.service.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Sales Controller - Fixed Version
 * Handles all sales-related CRUD operations with proper error handling
 */
@Slf4j
@RestController
@RequestMapping("/api/organizations/{orgId}/sales")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://localhost:3000", "https://your-production-domain.com"},
    allowedHeaders = "*",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;

    /**
     * Create a new sale
     * POST /api/organizations/{orgId}/sales
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> createSale(
            @PathVariable String orgId,
            @Valid @RequestBody SalesCreateDTO dto
    ) {
        try {
            dto.setOrganizationId(orgId);
            log.info("📝 Creating sale for orgId={} empId={}", orgId, dto.getEmpId());

            SalesResponseDTO response = salesService.createSale(dto);

            log.info("✅ Sale created successfully: saleId={}", response.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Validation error creating sale: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Validation Error",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ Error creating sale for orgId={}: {}", orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to create sale: " + e.getMessage()
            ));
        }
    }

    /**
     * Get all sales for organization
     * GET /api/organizations/{orgId}/sales
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getAllSales(@PathVariable String orgId) {
        try {
            log.info("📊 Fetching all sales for orgId={}", orgId);
            List<SalesResponseDTO> sales = salesService.getAllSales(orgId);
            log.info("✅ Fetched {} sales for orgId={}", sales.size(), orgId);
            return ResponseEntity.ok(sales);
        } catch (Exception e) {
            log.error("❌ Error fetching sales for orgId={}: {}", orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to fetch sales: " + e.getMessage()
            ));
        }
    }

    /**
     * Get sales by date range
     * GET /api/organizations/{orgId}/sales/by-date?from=2025-10-01T00:00:00&to=2025-10-31T23:59:59
     */
    @GetMapping("/by-date")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getSalesByDateRange(
            @PathVariable String orgId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        try {
            log.info("📅 Fetching sales by date range for orgId={} from={} to={}", orgId, from, to);
            List<SalesResponseDTO> sales = salesService.getSalesByDateRange(orgId, from, to);
            log.info("✅ Fetched {} sales for orgId={} in date range", sales.size(), orgId);
            return ResponseEntity.ok(sales);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Invalid date range: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid Date Range",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ Error fetching sales by date for orgId={}: {}", orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to fetch sales by date: " + e.getMessage()
            ));
        }
    }

    /**
     * Get a sale by its ID
     * GET /api/organizations/{orgId}/sales/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getSaleById(
            @PathVariable String orgId,
            @PathVariable String id
    ) {
        try {
            log.info("🔍 Fetching sale id={} for orgId={}", id, orgId);
            SalesResponseDTO sale = salesService.getSaleById(id);
            
            if (sale == null) {
                log.warn("⚠️ Sale not found: id={}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Not Found",
                    "message", "Sale not found with id: " + id
                ));
            }
            
            log.info("✅ Fetched sale: saleId={}", sale.getId());
            return ResponseEntity.ok(sale);
        } catch (Exception e) {
            log.error("❌ Error fetching sale id={} for orgId={}: {}", id, orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to fetch sale: " + e.getMessage()
            ));
        }
    }

    /**
     * Update a sale
     * PUT /api/organizations/{orgId}/sales/{id}
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<?> updateSale(
            @PathVariable String orgId,
            @PathVariable String id,
            @Valid @RequestBody SalesUpdateDTO dto
    ) {
        try {
            log.info("✏️ Updating sale id={} for orgId={}", id, orgId);
            SalesResponseDTO updated = salesService.updateSale(id, dto);
            
            if (updated == null) {
                log.warn("⚠️ Sale not found for update: id={}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Not Found",
                    "message", "Sale not found with id: " + id
                ));
            }
            
            log.info("✅ Sale updated successfully: saleId={}", updated.getId());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Validation error updating sale: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Validation Error",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ Error updating sale id={} for orgId={}: {}", id, orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to update sale: " + e.getMessage()
            ));
        }
    }

    /**
     * Delete a sale
     * DELETE /api/organizations/{orgId}/sales/{id}
     * 
     * FIXED: Changed path variable from {saleId} to {id} for consistency
     * FIXED: Made employeeId optional with fallback to "SYSTEM"
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<?> deleteSale(
            @PathVariable String orgId,
            @PathVariable String id,
            @RequestHeader(value = "X-Employee-Id", required = false) String employeeId
    ) {
        try {
            // Use "SYSTEM" as fallback if employeeId is not provided
            String deletedBy = (employeeId != null && !employeeId.isEmpty()) ? employeeId : "SYSTEM";
            
            log.info("🗑️ Deleting sale id={} for orgId={} by employee={}", id, orgId, deletedBy);
            salesService.deleteSale(id, deletedBy);
            
            log.info("✅ Sale deleted successfully: saleId={}", id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Sale not found for deletion: id={}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Not Found",
                "message", "Sale not found with id: " + id
            ));
        } catch (Exception e) {
            log.error("❌ Error deleting sale id={} for orgId={}: {}", id, orgId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "Failed to delete sale: " + e.getMessage()
            ));
        }
    }
}
