import Swal from 'sweetalert2';

export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: '#059669', // emerald-600
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200',
      title: 'text-slate-900 font-bold',
      confirmButton: 'rounded-full px-6 py-2.5 font-semibold text-sm',
    },
  });
};

export const showErrorAlert = (title: string, text?: string, footer?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    footer,
    confirmButtonColor: '#e11d48', // rose-600
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200',
      title: 'text-slate-900 font-bold',
      confirmButton: 'rounded-full px-6 py-2.5 font-semibold text-sm',
    },
  });
};

export const showWarningAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#ea580c', // orange-600
    confirmButtonText: 'Continuar',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200',
      title: 'text-slate-900 font-bold',
      confirmButton: 'rounded-full px-6 py-2.5 font-semibold text-sm',
    },
  });
};

export const showConfirmAlert = async (
  title: string,
  text: string,
  confirmText: string = 'Sí, eliminar',
  cancelText: string = 'Cancelar'
): Promise<boolean> => {
  const res = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200',
      title: 'text-slate-900 font-bold',
      confirmButton: 'rounded-full px-5 py-2.5 font-semibold text-sm',
      cancelButton: 'rounded-full px-5 py-2.5 font-semibold text-sm',
    },
  });
  return res.isConfirmed;
};
