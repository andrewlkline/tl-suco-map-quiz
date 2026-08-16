#!/usr/bin/env python3
"""Convert TLS admin boundary shapefiles into simplified GeoJSON for the map quiz."""
import json
import shapefile
from shapely.geometry import shape, mapping
from collections import Counter, defaultdict

RAW = "shapefile_raw"
OUT = "data"

SIMPLIFY_TOLERANCE = 0.0004  # degrees, ~40m at this latitude

# Known misspellings in the source shapefile (not alternate spellings —
# genuine errors), corrected here by pcode so the game displays and teaches
# the right name. The old spelling still gets accepted when typed, via the
# app's fuzzy-match leniency, so this doesn't break anything for players
# who know the shapefile's version.
NAME_CORRECTIONS = {
    "TL030107": "Gariuai",   # shapefile has "Fariuai"
    "TL030608": "Uatuhaco",  # shapefile has "Uataco"
}


def corrected_name(pcode, name):
    return NAME_CORRECTIONS.get(pcode, name)


def load(layer):
    sf = shapefile.Reader(f"{RAW}/{layer}")
    fields = [f[0] for f in sf.fields[1:]]
    out = []
    for sr in sf.shapeRecords():
        rec = dict(zip(fields, sr.record))
        geom = shape(sr.shape.__geo_interface__)
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = geom.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        out.append((rec, geom))
    return out


def to_feature(geom, props):
    rp = geom.representative_point()
    props["_lon"] = round(rp.x, 5)
    props["_lat"] = round(rp.y, 5)
    b = geom.bounds  # (minx, miny, maxx, maxy)
    props["_bbox"] = [round(v, 5) for v in b]
    return {"type": "Feature", "properties": props, "geometry": mapping(geom)}


def write_fc(path, features):
    fc = {"type": "FeatureCollection", "features": features}
    with open(path, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(f"wrote {path}: {len(features)} features, {len(json.dumps(fc))/1024:.0f} KB")


def main():
    # --- Municipalities (admin1) ---
    admin1 = load("tls_admin1")
    muni_features = []
    for rec, geom in admin1:
        props = {
            "id": rec["adm1_pcode"],
            "name": corrected_name(rec["adm1_pcode"], rec["adm1_name"]),
        }
        muni_features.append(to_feature(geom, props))
    write_fc(f"{OUT}/municipalities.geojson", muni_features)

    # --- Administrative posts (admin2) ---
    admin2 = load("tls_admin2")
    post_features = []
    post_names = Counter()
    for rec, geom in admin2:
        name = corrected_name(rec["adm2_pcode"], rec["adm2_name"])
        props = {
            "id": rec["adm2_pcode"],
            "name": name,
            "muni_id": rec["adm1_pcode"],
            "muni_name": corrected_name(rec["adm1_pcode"], rec["adm1_name"]),
        }
        post_names[name] += 1
        post_features.append(to_feature(geom, props))
    write_fc(f"{OUT}/admin_posts.geojson", post_features)
    dupes = {k: v for k, v in post_names.items() if v > 1}
    if dupes:
        print("Duplicate admin-post names (country-wide):", dupes)

    # --- Sucos (admin3) ---
    admin3 = load("tls_admin3")
    suco_features = []
    suco_names_country = Counter()
    suco_names_by_muni = defaultdict(Counter)
    for rec, geom in admin3:
        name = corrected_name(rec["adm3_pcode"], rec["adm3_name"])
        props = {
            "id": rec["adm3_pcode"],
            "name": name,
            "post_id": rec["adm2_pcode"],
            "post_name": corrected_name(rec["adm2_pcode"], rec["adm2_name"]),
            "muni_id": rec["adm1_pcode"],
            "muni_name": corrected_name(rec["adm1_pcode"], rec["adm1_name"]),
        }
        suco_names_country[name] += 1
        suco_names_by_muni[rec["adm1_pcode"]][name] += 1
        suco_features.append(to_feature(geom, props))
    write_fc(f"{OUT}/sucos.geojson", suco_features)

    dupes_country = {k: v for k, v in suco_names_country.items() if v > 1}
    print(f"\nDuplicate suco names country-wide: {len(dupes_country)}")
    for k, v in list(dupes_country.items())[:20]:
        print(f"  {k}: {v}x")

    dupes_muni = 0
    for muni_id, counter in suco_names_by_muni.items():
        for name, cnt in counter.items():
            if cnt > 1:
                dupes_muni += 1
    print(f"Duplicate suco names within same municipality: {dupes_muni}")


if __name__ == "__main__":
    main()
