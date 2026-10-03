from rest_framework import serializers


class OperationsAssistantRequestSerializer(serializers.Serializer):
    note = serializers.CharField(
        min_length=10,
        max_length=2000,
        trim_whitespace=True,
    )

    language = serializers.ChoiceField(
        choices=["en", "ar"],
        default="en",
        required=False,
    )


class MissingInformationItemSerializer(serializers.Serializer):
    field = serializers.CharField(
        max_length=100
    )

    question = serializers.CharField(
        max_length=300
    )

    type = serializers.ChoiceField(
        choices=[
            "text",
            "textarea",
            "choice",
            "date",
            "time",
            "boolean",
        ]
    )

    options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )


class OperationsAssistantResponseSerializer(serializers.Serializer):
    summary = serializers.CharField()

    category = serializers.ChoiceField(
        choices=[
            "MISSION",
            "VEHICLE",
            "EQUIPMENT",
            "GENERAL",
        ]
    )

    urgency = serializers.ChoiceField(
        choices=[
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        ]
    )

    key_details = serializers.ListField(
        child=serializers.CharField(),
        max_length=6,
    )

    missing_information = MissingInformationItemSerializer(
        many=True
    )

    recommended_actions = serializers.ListField(
        child=serializers.CharField(),
        max_length=5,
    )

    suggested_module = serializers.ChoiceField(
        choices=[
            "MISSIONS",
            "VEHICLE_ISSUES",
            "EQUIPMENT",
            "LENDING",
            "GENERAL",
        ]
    )

    draft = serializers.DictField()