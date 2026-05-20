package com.project.hostel_management.controller;

import com.project.hostel_management.model.Menu;
import com.project.hostel_management.service.MenuService;
import com.project.hostel_management.service.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/menu")
@CrossOrigin("*")
public class MenuController {

    @Autowired
    private MenuService menuService;

    @Autowired
    private SecurityUtil securityUtil;

    // GET API
    @GetMapping
    public List<Menu> getMenus() {
        return menuService.getAllMenus();
    }

    // POST API
    @PostMapping
    public Menu createMenu(@RequestBody Menu menu) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return menuService.saveMenu(menu);
    }

    // GET by ID
    @GetMapping("/{id}")
    public Menu getMenuById(@PathVariable Long id) {
        return menuService.getMenuById(id);
    }

    // PUT - Update menu by ID
    @PutMapping("/{id}")
    public Menu updateMenu(@PathVariable Long id, @RequestBody Menu menu) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return menuService.updateMenu(id, menu);
    }
}
