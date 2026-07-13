<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="sm xhtml">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="sq">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sitemap — Rent Ride</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
          header { background: #1d4ed8; color: white; padding: 20px 32px; display: flex; align-items: center; gap: 12px; }
          header svg { flex-shrink: 0; }
          header h1 { font-size: 1.25rem; font-weight: 600; }
          header p { font-size: 0.8rem; opacity: 0.8; margin-top: 2px; }
          .container { max-width: 960px; margin: 0 auto; padding: 32px 16px; }
          .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
          .stat { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; font-size: 0.85rem; color: #64748b; }
          .stat strong { display: block; font-size: 1.4rem; font-weight: 700; color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          thead tr { background: #1e293b; color: white; }
          thead th { padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
          tbody tr:last-child { border-bottom: none; }
          tbody tr:hover { background: #f8fafc; }
          td { padding: 10px 16px; font-size: 0.83rem; vertical-align: middle; }
          td a { color: #2563eb; text-decoration: none; word-break: break-all; }
          td a:hover { text-decoration: underline; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 600; }
          .pri-high { background: #dcfce7; color: #166534; }
          .pri-mid  { background: #fef9c3; color: #854d0e; }
          .pri-low  { background: #f1f5f9; color: #64748b; }
          .freq     { color: #94a3b8; font-size: 0.75rem; }
          .date     { color: #64748b; white-space: nowrap; }
          footer    { text-align: center; margin-top: 32px; font-size: 0.75rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <header>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <div>
            <h1>Rent Ride — XML Sitemap</h1>
            <p>rentride.al</p>
          </div>
        </header>

        <div class="container">
          <div class="stats">
            <div class="stat">
              <strong><xsl:value-of select="count(sm:urlset/sm:url)" /></strong>
              URL gjithsej
            </div>
            <div class="stat">
              <strong><xsl:value-of select="count(sm:urlset/sm:url[sm:priority &gt;= 0.9])" /></strong>
              Prioritet i lartë (≥0.9)
            </div>
            <div class="stat">
              <strong><xsl:value-of select="count(sm:urlset/sm:url[contains(sm:loc,'/makina/') or contains(sm:loc,'/car/')])" /></strong>
              Faqe makinash
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>URL</th>
                <th>Lastmod</th>
                <th>Freq</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sm:urlset/sm:url">
                <xsl:variable name="pri" select="number(sm:priority)" />
                <tr>
                  <td style="color:#94a3b8;font-size:0.75rem"><xsl:value-of select="position()" /></td>
                  <td><a href="{sm:loc}" target="_blank" rel="noopener"><xsl:value-of select="sm:loc" /></a></td>
                  <td class="date"><xsl:value-of select="sm:lastmod" /></td>
                  <td class="freq"><xsl:value-of select="sm:changefreq" /></td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="$pri &gt;= 0.9">
                        <span class="badge pri-high"><xsl:value-of select="sm:priority" /></span>
                      </xsl:when>
                      <xsl:when test="$pri &gt;= 0.6">
                        <span class="badge pri-mid"><xsl:value-of select="sm:priority" /></span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="badge pri-low"><xsl:value-of select="sm:priority" /></span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <footer>
            Gjeneruar automatikisht nga backend · <xsl:value-of select="count(sm:urlset/sm:url)" /> URLs
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
