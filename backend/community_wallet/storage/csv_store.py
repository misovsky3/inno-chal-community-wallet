import csv
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Union


class CsvStore:
    def __init__(self, path: Union[str, Path], fieldnames: Sequence[str]) -> None:
        self.path = Path(path)
        self.fieldnames = list(fieldnames)
        self.path.parent.mkdir(parents=True, exist_ok=True)

        if not self.path.exists():
            with self.path.open("w", newline="", encoding="utf-8") as csv_file:
                csv.DictWriter(csv_file, fieldnames=self.fieldnames).writeheader()

    def read_all(self) -> list[dict[str, str]]:
        with self.path.open("r", newline="", encoding="utf-8") as csv_file:
            return list(csv.DictReader(csv_file))

    def append(self, row: Mapping[str, object]) -> None:
        rows = self.read_all()
        rows.append({key: str(value) for key, value in row.items()})
        self.write_all(rows)

    def write_all(self, rows: Sequence[Mapping[str, object]]) -> None:
        temporary_path = self.path.with_suffix(self.path.suffix + ".tmp")
        with temporary_path.open("w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=self.fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        temporary_path.replace(self.path)