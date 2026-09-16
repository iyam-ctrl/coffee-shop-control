# API Contract

Contract API akan didefinisikan setelah domain dan role access v0.1 dikunci.

Prinsip awal:

- Manager bekerja pada store yang ditugaskan.
- Owner dapat melihat business dan seluruh store yang dimilikinya.
- Semua operasi sensitif tetap diverifikasi di backend/RLS.
- Client tidak boleh menggunakan Supabase service role key.
