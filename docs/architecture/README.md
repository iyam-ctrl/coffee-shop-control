# Architecture

```text
                 COFFEE SHOP CONTROL
                    /           \
             MANAGER APP     OWNER APP
                    \           /
                     SHARED BACKEND
                           |
                        SUPABASE
                           |
                       POSTGRESQL
```

Kedua aplikasi membaca dan menulis domain bisnis yang sama melalui Supabase. Otorisasi berbasis role dan store/business scope harus ditegakkan di backend melalui RLS dan business rules.
