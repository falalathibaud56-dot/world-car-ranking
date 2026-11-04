[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/api/races"
  to = "/.netlify/functions/races"
  status = 200

[functions."sync-results"]
  schedule = "*/15 * * * *"
