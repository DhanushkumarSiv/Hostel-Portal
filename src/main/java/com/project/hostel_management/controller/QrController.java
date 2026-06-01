package com.project.hostel_management.controller;

import com.project.hostel_management.service.QrCodeService;
import com.project.hostel_management.service.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/qr")
@CrossOrigin("*")
public class QrController {

    @Autowired
    private QrCodeService qrCodeService;

    @Autowired
    private SecurityUtil securityUtil;

    @PostMapping("/decode")
    public Map<String, String> decodeQr(@RequestBody Map<String, String> body) {
        if (!securityUtil.hasAnyRole("STUDENT", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String qrData = qrCodeService.decodeQrFromImageData(body.get("imageData"));
        return Map.of("qrData", qrData == null ? "" : qrData);
    }
}
