from django.core.exceptions import ValidationError
import re

class UppercaseValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                "The password must contain at least one uppercase letter.",
                code='password_no_upper',
            )

    def get_help_text(self):
        return "Your password must contain at least one uppercase letter."
