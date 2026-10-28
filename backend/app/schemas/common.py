from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, BeforeValidator

T = TypeVar("T")


def _to_float(value):
    return None if value is None else float(value)


# Database Decimals are sent to the browser as plain numbers.
Num = Annotated[float | None, BeforeValidator(_to_float)]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class Message(BaseModel):
    message: str
