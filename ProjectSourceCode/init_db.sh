#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

PG_URI="postgresql://exampleuser:XkVjqTNObpqjpxq2t5OzUpiiD7SE5c7D@dpg-d4fpk3q4d50c73evbn50-a.oregon-postgres.render.com/users_db_3dh9"

# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
