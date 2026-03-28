from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.transaction import Transaction, TransactionKind
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead
from app.services.classifier_service import classifier

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    txs = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.transaction_date))
        .limit(limit)
    ).all()
    return txs


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    category = payload.category

    if payload.kind == TransactionKind.EXPENSE and not category:
        category = classifier.predict(payload.description, payload.amount)
    elif payload.kind == TransactionKind.INCOME and not category:
        category = "salary"

    tx = Transaction(
        user_id=current_user.id,
        branch_account_id=payload.branch_account_id,
        description=payload.description,
        amount=payload.amount,
        category=(category or "other").lower(),
        kind=payload.kind,
        merchant=payload.merchant,
        transaction_date=payload.transaction_date,
    )

    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    tx = db.get(Transaction, transaction_id)
    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(tx)
    db.commit()
