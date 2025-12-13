from rest_framework import permissions
from .models import Profile

class IsOwner(permissions.BasePermission):
    """
    Allows access only to users with the 'owner' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == Profile.ROLE_OWNER
        )

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to users with 'owner' or 'admin' roles.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        return request.user.profile.role in [Profile.ROLE_OWNER, Profile.ROLE_ADMIN]

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the snippet.
        # Assumes the model instance has an `owner` or `user` attribute.
        return getattr(obj, 'user', None) == request.user or getattr(obj, 'owner', None) == request.user
