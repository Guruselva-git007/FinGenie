from sqlalchemy import inspect, text


USER_SCOPED_TABLES = [
    "transactions",
    "budgets",
    "savings_goals",
    "wealth_accounts",
    "net_worth_snapshots",
    "assistant_tasks",
    "donations",
    "feedback_entries",
    "user_preferences",
    "user_profiles",
    "branch_accounts",
]


def _column_names(connection, table_name: str) -> set[str]:
    inspector = inspect(connection)
    return {column["name"] for column in inspector.get_columns(table_name)}


def ensure_runtime_schema(engine) -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())

        for table_name in USER_SCOPED_TABLES:
            if table_name not in existing_tables:
                continue
            columns = _column_names(connection, table_name)
            if "user_id" not in columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id INTEGER NULL"))

        if "transactions" in existing_tables:
            columns = _column_names(connection, "transactions")
            if "branch_account_id" not in columns:
                connection.execute(text("ALTER TABLE transactions ADD COLUMN branch_account_id INTEGER NULL"))

        if "budgets" in existing_tables:
            inspector = inspect(connection)
            unique_names = {item["name"] for item in inspector.get_unique_constraints("budgets")}
            if "uq_budget_category" in unique_names:
                connection.execute(text("ALTER TABLE budgets DROP INDEX uq_budget_category"))
                unique_names.discard("uq_budget_category")
            if "uq_budget_user_category" not in unique_names:
                connection.execute(text("ALTER TABLE budgets ADD CONSTRAINT uq_budget_user_category UNIQUE (user_id, category)"))
