import pandas as pd
import os
import sys
import numpy as np

def excel_to_clean_csv(excel_path):
    # Ensure the file exists
    if not os.path.exists(excel_path):
        print(f"Error: File '{excel_path}' not found.")
        sys.exit(1)

    # Output CSV in the current working directory
    base_name = os.path.splitext(os.path.basename(excel_path))[0]
    output_csv_path = os.path.join(os.getcwd(), f"{base_name}.csv")

    # Load first sheet as values only
    df = pd.read_excel(excel_path, sheet_name=0, engine="openpyxl")

    # Keep only columns B–H
    df = df.iloc[:, 1:8]

    # Replace NaN with empty string temporarily
    df = df.applymap(lambda x: x if not pd.isna(x) else "")

    # Drop rows that are completely empty (all cells are "")
    df = df[~(df.applymap(lambda x: str(x).strip() == "").all(axis=1))]

    # Convert floats that represent whole numbers (e.g. 3.0) to int
    def convert_value(x):
        if isinstance(x, float) and x.is_integer():
            return int(x)
        return x

    df = df.applymap(convert_value)

    # Save cleaned data to CSV in current working directory
    df.to_csv(output_csv_path, index=False)

    print(f"✅ Clean CSV saved to: {output_csv_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python excel_to_clean_csv.py <workbook.xlsx>")
        sys.exit(1)

    excel_to_clean_csv(sys.argv[1])
