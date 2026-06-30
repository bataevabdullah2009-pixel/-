"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { SaleItem } from "@voice-sales-log/shared/types";
import {
  excludeSaleItemAction,
  type SaleItemActionState,
  updateSaleItemAction
} from "@/app/daily-report/actions";
import { formatCurrency, formatQuantity, getStatusLabel } from "@/features/records/records.utils";

type SaleItemCardProps = {
  item: SaleItem;
};

const initialSaleItemActionState: SaleItemActionState = {
  status: "idle",
  message: ""
};

function ActionIcon({ name }: { name: "edit" | "delete" }) {
  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 20 4.4-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z" />
        <path d="m14.8 6.2 3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  className
}: {
  idleLabel: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function SaleItemCard({ item }: SaleItemCardProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showUpdateError, setShowUpdateError] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [updateState, updateAction] = useActionState(
    updateSaleItemAction,
    initialSaleItemActionState
  );
  const [deleteState, deleteAction] = useActionState(
    excludeSaleItemAction,
    initialSaleItemActionState
  );

  useEffect(() => {
    if (updateState.status === "error") {
      setShowUpdateError(true);
      return;
    }
    if (updateState.status === "success") {
      setShowUpdateError(false);
      setIsEditing(false);
      router.refresh();
    }
  }, [router, updateState]);

  useEffect(() => {
    if (deleteState.status === "error") {
      setShowDeleteError(true);
      return;
    }
    if (deleteState.status === "success") {
      setShowDeleteError(false);
      setIsDeleted(true);
      router.refresh();
    }
  }, [deleteState, router]);

  if (isDeleted) {
    return null;
  }

  const total = item.total === null ? "Не входит в выручку" : formatCurrency(item.total);
  const price = item.price === null
    ? `${formatQuantity(item.quantity)} ${item.unit}, цена не указана`
    : `${formatQuantity(item.quantity)} ${item.unit} × ${formatCurrency(item.price)}`;

  return (
    <article className={`saleItemCard ${item.status !== "processed" ? "saleItemCardAttention" : ""}`}>
      <div className="saleItemView">
        <div className="saleItemContent">
          <div className="saleItemTitleRow">
            <h4>{item.product_name || "Без названия"}</h4>
            {item.status !== "processed" ? (
              <span className={`status status-${item.status}`}>{getStatusLabel(item.status)}</span>
            ) : null}
          </div>
          <div className="saleItemMeta">
            <span>{price}</span>
          </div>
          <strong className="saleItemTotal">{total}</strong>
        </div>

        <div className="saleItemActions" aria-label={`Действия с товаром ${item.product_name}`}>
          <button
            type="button"
            className="iconButton"
            aria-label={`Редактировать ${item.product_name}`}
            aria-expanded={isEditing}
            onClick={() => {
              setShowUpdateError(false);
              setIsDeleteOpen(false);
              setIsEditing((current) => !current);
            }}
          >
            <ActionIcon name="edit" />
          </button>
          <button
            type="button"
            className="iconButton iconButtonDanger"
            aria-label={`Удалить ${item.product_name} из отчёта`}
            aria-expanded={isDeleteOpen}
            onClick={() => {
              setShowDeleteError(false);
              setIsEditing(false);
              setIsDeleteOpen((current) => !current);
            }}
          >
            <ActionIcon name="delete" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <form ref={formRef} action={updateAction} className="saleItemEditForm">
          <input type="hidden" name="itemId" value={item.id} />
          <label className="saleItemProductField">
            <span>Товар</span>
            <input
              name="productName"
              type="text"
              defaultValue={item.product_name}
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Количество</span>
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.001"
              step="0.001"
              defaultValue={item.quantity}
              required
            />
          </label>
          <label>
            <span>Цена, ₽</span>
            <input
              name="price"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              defaultValue={item.price ?? ""}
              required
            />
          </label>

          {showUpdateError ? (
            <p className="saleItemError" role="alert">{updateState.message}</p>
          ) : null}

          <div className="saleItemFormActions">
            <SubmitButton
              className="saveButton"
              idleLabel="Сохранить"
              pendingLabel="Сохраняем…"
            />
            <button
              type="button"
              className="secondaryActionButton"
              onClick={() => {
                formRef.current?.reset();
                setShowUpdateError(false);
                setIsEditing(false);
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {isDeleteOpen ? (
        <div className="saleItemDeletePanel">
          <p>Удалить товар из отчёта?</p>
          {showDeleteError ? (
            <p className="saleItemError" role="alert">{deleteState.message}</p>
          ) : null}
          <form action={deleteAction} className="saleItemDeleteActions">
            <input type="hidden" name="itemId" value={item.id} />
            <SubmitButton
              className="deleteConfirmButton"
              idleLabel="Удалить"
              pendingLabel="Удаляем…"
            />
            <button
              type="button"
              className="secondaryActionButton"
              onClick={() => {
                setShowDeleteError(false);
                setIsDeleteOpen(false);
              }}
            >
              Отмена
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
