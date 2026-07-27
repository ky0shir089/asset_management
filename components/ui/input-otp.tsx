"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type InputOTPContextValue = {
  value: string
  maxLength: number
  focusInput: () => void
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null)

type InputOTPProps = Omit<
  React.ComponentProps<"input">,
  "children" | "className" | "maxLength" | "onChange" | "type" | "value"
> & {
  children: React.ReactNode
  className?: string
  maxLength: number
  onChange?: (value: string) => void
  value?: string
}

function InputOTP({
  children,
  className,
  maxLength,
  onChange,
  value = "",
  ...props
}: InputOTPProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function focusInput() {
    inputRef.current?.focus()
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
      .replace(/\D/g, "")
      .slice(0, maxLength)

    onChange?.(nextValue)
  }

  return (
    <InputOTPContext.Provider value={{ value, maxLength, focusInput }}>
      <div
        data-slot="input-otp"
        className={cn("relative flex w-fit items-center", className)}
        onClick={focusInput}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 z-10 size-full cursor-text opacity-0"
          {...props}
        />
        {children}
      </div>
    </InputOTPContext.Provider>
  )
}

function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const context = React.useContext(InputOTPContext)
  const value = context?.value ?? ""
  const isActive = value.length === index

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex size-9 items-center justify-center border-y border-r border-input bg-background text-sm font-medium shadow-xs transition-all first:rounded-l-lg first:border-l last:rounded-r-lg",
        "data-[active=true]:z-20 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50",
        className
      )}
      {...props}
    >
      {value[index] ?? ""}
    </div>
  )
}

function InputOTPSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className={cn("flex items-center justify-center px-1 text-muted-foreground", className)}
      {...props}
    >
      -
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
