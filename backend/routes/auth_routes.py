from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from services.database import User, SessionLocal
from services.auth_utils import hash_password, verify_password, create_access_token

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(email: str, password: str, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=email,
        email=email,
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}
