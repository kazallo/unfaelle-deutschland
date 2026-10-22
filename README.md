# Unfälle Deutschland – Visual Analytics Dashboard

Interaktives Dashboard zu **allen polizeilich erfassten Verkehrsunfällen mit Personenschaden in Deutschland 2020–2024**: rund 1,27 Millionen Unfälle, vollständig und ohne Stichprobe.

**▶ Live-Demo: https://kazallo.github.io/unfaelle-deutschland/**

<!-- Screenshot: Bild als docs/screenshot.png ablegen und die folgende Zeile einkommentieren -->
<!-- ![Screenshot des Dashboards](docs/screenshot.png) -->

## Funktionen

- **Zeitraffer**: Ein komplettes Unfalljahr wird Punkt für Punkt auf der Deutschlandkarte nachgespielt, mit laufenden Zählern für Unfälle, Getötete, Schwer- und Leichtverletzte.
- **Räumliche Verteilung**: Unfallkarte und Choroplethenkarte der Bundesländer.
- **Unfälle je Land**: Vergleich der 16 Bundesländer.
- **Kollisions-Orbit**: Welche Verkehrsbeteiligten (Pkw, Fahrrad, Fußgänger, Kraftrad, Güterverkehr …) wie oft miteinander verunglücken.
- **Unfall-Uhr und Rhythmus**: Verteilung nach Tageszeit, Wochentag und Monat.
- **Entwicklung 2020–2024**: absolute Zahlen, Anteile sowie Rate schwerer und tödlicher Unfälle.
- **Crossfilter**: Ein Klick auf Balken oder Zellen filtert alle Ansichten gleichzeitig. Mehrfachauswahl innerhalb einer Dimension gilt als ODER, zwischen Dimensionen als UND.

## Technik

- [D3.js](https://d3js.org/) v7 für Diagramme und Interaktion
- [Leaflet](https://leafletjs.com/) für Karten
- Canvas-Rendering für die Zeitraffer-Animation
- Reines HTML, CSS und JavaScript, ohne Build-Schritt und ohne Backend. Die aufbereiteten Daten liegen als JS-Dateien in `js/data/`.

## Lokal starten

```bash
git clone https://github.com/kazallo/unfaelle-deutschland.git
cd unfaelle-deutschland
python3 -m http.server 8000
```

Danach `http://localhost:8000` im Browser öffnen.

## Projektstruktur

```
index.html          Seitenaufbau (Startseite mit Zeitraffer + Analyse-Ansicht)
css/styles.css      Gestaltung
js/constants.js     Spaltenindizes, Labels, Farben
js/filters.js       Crossfilter-Logik
js/charts.js        D3-Diagramme
js/zeitraffer.js    Animierte Karte
js/navigation.js    Wechsel zwischen den Ansichten
js/ui-helpers.js    Hilfsfunktionen
js/data/            Aufbereitete Unfall-, Zeitreihen- und Geodaten
```

## Datenquelle

Statistische Ämter des Bundes und der Länder, [Unfallatlas](https://unfallatlas.statistikportal.de/) 2020–2024 (Open Data über [destatis.de](https://www.destatis.de/)), lizenziert unter der [Datenlizenz Deutschland – Namensnennung – Version 2.0](https://www.govdata.de/dl-de/by-2-0). Die Rohdaten wurden für die Visualisierung aufbereitet und reduziert.

## Autor

Theo Zech · entstanden im Rahmen eines Visual-Analytics-Kurses
