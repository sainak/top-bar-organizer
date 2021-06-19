#!/bin/bash

set -e

REAL_BASE_DIR=$( dirname $( readlink -f "$0" ))

glib-compile-schemas "$REAL_BASE_DIR/src/schemas"
rm "$REAL_BASE_DIR/top-bar-organizer@julian.gse.jsts.xyz.zip" || true
cd "$REAL_BASE_DIR/src"
zip -r "$REAL_BASE_DIR/top-bar-organizer@julian.gse.jsts.xyz.zip" *
zip -d "$REAL_BASE_DIR/top-bar-organizer@julian.gse.jsts.xyz.zip" "schemas/org.gnome.shell.extensions.top-bar-organizer.gschema.xml"
