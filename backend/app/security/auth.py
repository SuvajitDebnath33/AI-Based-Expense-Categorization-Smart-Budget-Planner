from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

try:
    import jwt
    from jwt import InvalidTokenError
except ImportError:  # pragma: no cover - handled at runtime
    jwt = None  # type: ignore[assignment]
    InvalidTokenError = Exception  # type: ignore[assignment]

from app.config import settings


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    user_id: int


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> AuthUser:
    if not settings.auth_required:
        return AuthUser(user_id=settings.default_user_id)

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    if jwt is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT dependency missing. Install PyJWT to enable AUTH_REQUIRED mode.",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    token_user = payload.get("sub") or payload.get("user_id")
    if token_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user id")

    try:
        return AuthUser(user_id=int(token_user))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user id in token") from exc
