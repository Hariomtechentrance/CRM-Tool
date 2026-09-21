-- CreateEnum
CREATE TYPE "TailorCustomerGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "TailorCustomer" ADD COLUMN     "gender" "TailorCustomerGender";

